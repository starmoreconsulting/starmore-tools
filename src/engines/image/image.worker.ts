import type { ImageWorkerTask, WorkerProgress } from './toolkit';

interface WorkerRequest {
	id: string;
	task: ImageWorkerTask;
}

const workerScope = self as unknown as {
	postMessage(message: unknown, transfer?: Transferable[]): void;
	onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null;
};

function emitProgress(id: string, completed: number, total: number): void {
	workerScope.postMessage({ id, progress: { completed, total } satisfies WorkerProgress });
}

function srgbToLinear(value: number): number {
	const normalized = value / 255;
	return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
}

function linearToSrgb(value: number): number {
	const clamped = Math.max(0, Math.min(1, value));
	return Math.round(255 * (clamped <= 0.0031308 ? clamped * 12.92 : 1.055 * clamped ** (1 / 2.4) - 0.055));
}

function sinc(value: number): number {
	if (Math.abs(value) < 1e-8) return 1;
	const angle = Math.PI * value;
	return Math.sin(angle) / angle;
}

function lanczos(value: number): number {
	const distance = Math.abs(value);
	return distance < 3 ? sinc(distance) * sinc(distance / 3) : 0;
}

interface FilterTap {
	index: number;
	weight: number;
}

function createTaps(sourceSize: number, outputSize: number, outputIndex: number, nearest: boolean): FilterTap[] {
	const center = (outputIndex + 0.5) * sourceSize / outputSize - 0.5;
	if (nearest) return [{ index: Math.max(0, Math.min(sourceSize - 1, Math.round(center))), weight: 1 }];
	const scale = sourceSize / outputSize;
	const radius = 3 * Math.max(1, scale);
	const start = Math.ceil(center - radius);
	const end = Math.floor(center + radius);
	const taps: FilterTap[] = [];
	let sum = 0;
	for (let source = start; source <= end; source += 1) {
		const weight = lanczos((center - source) / Math.max(1, scale));
		if (weight === 0) continue;
		taps.push({ index: Math.max(0, Math.min(sourceSize - 1, source)), weight });
		sum += weight;
	}
	return taps.map((tap) => ({ ...tap, weight: tap.weight / (sum || 1) }));
}

function resample(id: string, task: Extract<ImageWorkerTask, { type: 'upscale' }>): ImageData {
	const { data, width, height, outputWidth, outputHeight, mode, sharpen } = task;
	const totalPixels = outputWidth * outputHeight;
	if (totalPixels > 48_000_000) throw new Error('The requested output exceeds the 48 million pixel limit. Choose a smaller target size.');
	if (outputWidth > 12_000 || outputHeight > 12_000) throw new Error('The requested output exceeds the 12,000 px side limit. Choose a smaller target size.');
	if (data.length !== width * height * 4) throw new Error('The source pixel data is incomplete.');
	const intermediateBytes = outputWidth * height * 4 * Float32Array.BYTES_PER_ELEMENT;
	const outputBytes = totalPixels * 4;
	if (intermediateBytes + outputBytes + data.byteLength > 384 * 1024 * 1024) {
		throw new Error('This resize would require too much working memory for a reliable browser export. Try a smaller target width or a lower scale.');
	}
	const nearest = mode === 'pixel-art';
	const horizontalTaps = Array.from({ length: outputWidth }, (_, x) => createTaps(width, outputWidth, x, nearest));
	const verticalTaps = Array.from({ length: outputHeight }, (_, y) => createTaps(height, outputHeight, y, nearest));
	const intermediate = new Float32Array(outputWidth * height * 4);
	for (let y = 0; y < height; y += 1) {
		const sourceRow = y * width * 4;
		const targetRow = y * outputWidth * 4;
		for (let x = 0; x < outputWidth; x += 1) {
			const taps = horizontalTaps[x];
			const out = targetRow + x * 4;
			for (const { index, weight } of taps) {
				const source = sourceRow + index * 4;
				const alpha = data[source + 3] / 255;
				intermediate[out] += srgbToLinear(data[source]) * alpha * weight;
				intermediate[out + 1] += srgbToLinear(data[source + 1]) * alpha * weight;
				intermediate[out + 2] += srgbToLinear(data[source + 2]) * alpha * weight;
				intermediate[out + 3] += alpha * weight;
			}
		}
		if (y % 32 === 0) emitProgress(id, y, height + outputHeight);
	}
	const output = new Uint8ClampedArray(totalPixels * 4);
	for (let y = 0; y < outputHeight; y += 1) {
		const taps = verticalTaps[y];
		for (let x = 0; x < outputWidth; x += 1) {
			const target = (y * outputWidth + x) * 4;
			let red = 0;
			let green = 0;
			let blue = 0;
			let alpha = 0;
			for (const { index, weight } of taps) {
				const source = (index * outputWidth + x) * 4;
				red += intermediate[source] * weight;
				green += intermediate[source + 1] * weight;
				blue += intermediate[source + 2] * weight;
				alpha += intermediate[source + 3] * weight;
			}
			if (alpha > 1e-7) {
				const unpremultiply = 1 / alpha;
				const clampedAlpha = Math.max(0, Math.min(1, alpha));
				output[target] = linearToSrgb(red * unpremultiply);
				output[target + 1] = linearToSrgb(green * unpremultiply);
				output[target + 2] = linearToSrgb(blue * unpremultiply);
				output[target + 3] = Math.round(clampedAlpha * 255);
			}
		}
		if (y % 16 === 0) emitProgress(id, height + y, height + outputHeight);
	}
	if (!nearest) clampRinging(output, outputWidth, outputHeight, data, width, height);
	if (sharpen > 0) gentleSharpen(output, outputWidth, outputHeight, sharpen);
	emitProgress(id, height + outputHeight, height + outputHeight);
	return new ImageData(output, outputWidth, outputHeight);
}

function clampRinging(output: Uint8ClampedArray, width: number, height: number, source: Uint8ClampedArray, sourceWidth: number, sourceHeight: number): void {
	for (let y = 0; y < height; y += 1) {
		const sy = Math.max(0, Math.min(sourceHeight - 1, Math.round((y + 0.5) * sourceHeight / height - 0.5)));
		for (let x = 0; x < width; x += 1) {
			const sx = Math.max(0, Math.min(sourceWidth - 1, Math.round((x + 0.5) * sourceWidth / width - 0.5)));
			let min = 255;
			let max = 0;
			for (let yy = Math.max(0, sy - 1); yy <= Math.min(sourceHeight - 1, sy + 1); yy += 1) {
				for (let xx = Math.max(0, sx - 1); xx <= Math.min(sourceWidth - 1, sx + 1); xx += 1) {
					const sample = (yy * sourceWidth + xx) * 4;
					const luminance = 0.2126 * source[sample] + 0.7152 * source[sample + 1] + 0.0722 * source[sample + 2];
					min = Math.min(min, luminance);
					max = Math.max(max, luminance);
				}
			}
			const out = (y * width + x) * 4;
			const value = 0.2126 * output[out] + 0.7152 * output[out + 1] + 0.0722 * output[out + 2];
			if (value < min || value > max) {
				const target = Math.max(min, Math.min(max, value));
				const ratio = value > 0 ? target / value : 0;
				output[out] = Math.round(output[out] * ratio);
				output[out + 1] = Math.round(output[out + 1] * ratio);
				output[out + 2] = Math.round(output[out + 2] * ratio);
			}
		}
	}
}

function gentleSharpen(data: Uint8ClampedArray, width: number, height: number, amount: number): void {
	const source = new Uint8ClampedArray(data);
	const strength = Math.min(0.35, amount);
	for (let y = 1; y < height - 1; y += 1) {
		for (let x = 1; x < width - 1; x += 1) {
			const index = (y * width + x) * 4;
			for (let channel = 0; channel < 3; channel += 1) {
				const blur = (
					source[index - 4 + channel] + source[index + 4 + channel]
					+ source[index - width * 4 + channel] + source[index + width * 4 + channel]
				) / 4;
				data[index + channel] = Math.max(0, Math.min(255, source[index + channel] + (source[index + channel] - blur) * strength));
			}
		}
	}
}

workerScope.onmessage = (event: MessageEvent<WorkerRequest>) => {
	const { id, task } = event.data;
	try {
		const imageData = resample(id, task);
		workerScope.postMessage({
			id,
			result: { data: imageData.data, width: imageData.width, height: imageData.height },
		}, [imageData.data.buffer]);
	} catch (error) {
		workerScope.postMessage({ id, error: error instanceof Error ? error.message : 'The image could not be processed.' });
	}
};
