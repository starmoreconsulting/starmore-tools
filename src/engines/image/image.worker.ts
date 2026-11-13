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

function sharpenImage(id: string, task: Extract<ImageWorkerTask, { type: 'sharpen' }>): ImageData {
	const { data, width, height, amount, radius, threshold, contrast } = task;
	if (data.length !== width * height * 4) throw new Error('The source pixel data is incomplete.');
	if (width * height > 48_000_000) throw new Error('This image exceeds the 48 million pixel processing limit. Try a smaller image.');
	if (width * height * 32 > 384 * 1024 * 1024) throw new Error('This image needs too much working memory for safe browser processing. Try a smaller image.');
	const output = new Uint8ClampedArray(data);
	const horizontal = new Float32Array(width * height * 3);
	const blur = new Float32Array(width * height * 3);
	const kernelRadius = Math.max(1, Math.min(8, Math.round(radius)));
	const sigma = Math.max(0.5, kernelRadius / 1.5);
	const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));
	const weights: number[] = [];
	let weightTotal = 0;
	for (let offset = -kernelRadius; offset <= kernelRadius; offset += 1) {
		const weight = Math.exp(-(offset * offset) / (2 * sigma * sigma));
		weights.push(weight);
		weightTotal += weight;
	}
	for (let y = 0; y < height; y += 1) {
		for (let x = 0; x < width; x += 1) {
			const index = (y * width + x) * 3;
			for (let channel = 0; channel < 3; channel += 1) {
				let sum = 0;
				for (let offset = -kernelRadius; offset <= kernelRadius; offset += 1) {
					const sampleX = Math.max(0, Math.min(width - 1, x + offset));
					sum += data[(y * width + sampleX) * 4 + channel] * weights[offset + kernelRadius];
				}
				horizontal[index + channel] = sum / weightTotal;
			}
		}
		if (y % 64 === 0) emitProgress(id, y, height * 2);
	}
	for (let y = 0; y < height; y += 1) {
		for (let x = 0; x < width; x += 1) {
			const index = (y * width + x) * 3;
			for (let channel = 0; channel < 3; channel += 1) {
				let sum = 0;
				for (let offset = -kernelRadius; offset <= kernelRadius; offset += 1) {
					const sampleY = Math.max(0, Math.min(height - 1, y + offset));
					sum += horizontal[(sampleY * width + x) * 3 + channel] * weights[offset + kernelRadius];
				}
				blur[index + channel] = sum / weightTotal;
			}
		}
		if (y % 64 === 0) emitProgress(id, height + y, height * 2);
	}
	for (let y = 0; y < height; y += 1) {
		for (let x = 0; x < width; x += 1) {
			const index = (y * width + x) * 4;
			const blurIndex = (y * width + x) * 3;
			for (let channel = 0; channel < 3; channel += 1) {
				const difference = data[index + channel] - blur[blurIndex + channel];
				const sharpened = Math.abs(difference) < threshold
					? data[index + channel]
					: Math.max(0, Math.min(255, data[index + channel] + difference * amount));
				output[index + channel] = Math.max(0, Math.min(255, Math.round((sharpened - 128) * contrastFactor + 128)));
			}
		}
		if (y % 64 === 0) emitProgress(id, height * 2 + y, height * 3);
	}
	emitProgress(id, height * 3, height * 3);
	return new ImageData(output, width, height);
}

function denoiseImage(id: string, task: Extract<ImageWorkerTask, { type: 'denoise' }>): ImageData {
	const { data, width, height, luminanceStrength, colorStrength } = task;
	if (data.length !== width * height * 4) throw new Error('The source pixel data is incomplete.');
	if (width * height > 48_000_000) throw new Error('This image exceeds the 48 million pixel processing limit. Try a smaller image.');
	const output = new Uint8ClampedArray(data);
	const radius = 2;
	const spatialSigma = 1.6;
	const lumaSigma = Math.max(2, 10 + luminanceStrength * 45);
	const colorSigma = Math.max(2, 10 + colorStrength * 45);
	const totalRows = height;
	for (let y = 0; y < height; y += 1) {
		for (let x = 0; x < width; x += 1) {
			const center = (y * width + x) * 4;
			const centerLuma = 0.2126 * data[center] + 0.7152 * data[center + 1] + 0.0722 * data[center + 2];
			const sums = [0, 0, 0];
			let weightSum = 0;
			for (let oy = -radius; oy <= radius; oy += 1) {
				const sy = Math.max(0, Math.min(height - 1, y + oy));
				for (let ox = -radius; ox <= radius; ox += 1) {
					const sx = Math.max(0, Math.min(width - 1, x + ox));
					const sample = (sy * width + sx) * 4;
					const sampleLuma = 0.2126 * data[sample] + 0.7152 * data[sample + 1] + 0.0722 * data[sample + 2];
					const lumaDiff = sampleLuma - centerLuma;
					const spatialWeight = Math.exp(-(ox * ox + oy * oy) / (2 * spatialSigma * spatialSigma));
					const lumaWeight = luminanceStrength > 0 ? Math.exp(-(lumaDiff * lumaDiff) / (2 * lumaSigma * lumaSigma)) : 1;
					const colorDistance = ((data[sample] - data[center]) ** 2 + (data[sample + 1] - data[center + 1]) ** 2 + (data[sample + 2] - data[center + 2]) ** 2) / 3;
					const colorWeight = colorStrength > 0 ? Math.exp(-colorDistance / (2 * colorSigma * colorSigma)) : 1;
					const weight = spatialWeight * lumaWeight ** luminanceStrength * colorWeight ** colorStrength;
					weightSum += weight;
					for (let channel = 0; channel < 3; channel += 1) sums[channel] += data[sample + channel] * weight;
				}
			}
			const mix = Math.max(luminanceStrength, colorStrength) * 0.82;
			for (let channel = 0; channel < 3; channel += 1) {
				const filtered = sums[channel] / (weightSum || 1);
				output[center + channel] = Math.round(data[center + channel] * (1 - mix) + filtered * mix);
			}
		}
		if (y % 12 === 0) emitProgress(id, y, totalRows);
	}
	emitProgress(id, totalRows, totalRows);
	return new ImageData(output, width, height);
}

function adjustImage(id: string, task: Extract<ImageWorkerTask, { type: 'adjust' }>): ImageData {
	const { data, width, height, adjustments } = task;
	if (data.length !== width * height * 4) throw new Error('The source pixel data is incomplete.');
	if (width * height > 48_000_000) throw new Error('This image exceeds the 48 million pixel processing limit. Try a smaller image.');
	let stretchLow = 0;
	let stretchHigh = 255;
	if (adjustments.autoStretch) {
		const histogram = new Uint32Array(256);
		for (let index = 0; index < data.length; index += 4) {
			const value = Math.round(0.2126 * data[index] + 0.7152 * data[index + 1] + 0.0722 * data[index + 2]);
			histogram[value] += 1;
		}
		const target = Math.max(1, Math.floor(width * height * 0.01));
		let lowCount = 0;
		let highCount = 0;
		for (let value = 0; value < 256; value += 1) {
			lowCount += histogram[value];
			if (lowCount >= target) { stretchLow = value; break; }
		}
		for (let value = 255; value >= 0; value -= 1) {
			highCount += histogram[value];
			if (highCount >= target) { stretchHigh = value; break; }
		}
		if (stretchHigh <= stretchLow) { stretchLow = 0; stretchHigh = 255; }
	}
	const contrastFactor = (259 * (adjustments.contrast + 255)) / (255 * (259 - adjustments.contrast));
	const exposureFactor = 2 ** adjustments.exposure;
	for (let y = 0; y < height; y += 1) {
		for (let x = 0; x < width; x += 1) {
			const index = (y * width + x) * 4;
			let channels = [data[index], data[index + 1], data[index + 2]].map((value) => adjustments.autoStretch
				? (value - stretchLow) * 255 / (stretchHigh - stretchLow)
				: value);
			channels = channels.map((value) => ((value + adjustments.brightness - 128) * contrastFactor + 128) * exposureFactor);
			const luma = 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
			const saturation = adjustments.saturation / 100;
			const chromaRange = Math.max(...channels) - Math.min(...channels);
			const vibranceFactor = 1 + adjustments.vibrance / 100 * (1 - chromaRange / 255);
			channels = channels.map((value) => luma + (value - luma) * (1 + saturation) * vibranceFactor);
			const warmth = adjustments.temperature * 0.55;
			const greenShift = adjustments.tint * 0.35;
			channels[0] += warmth;
			channels[1] += greenShift;
			channels[2] -= warmth;
			const luminance = 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
			const shadowWeight = Math.max(0, 1 - luminance / 255) ** 2;
			const highlightWeight = Math.max(0, luminance / 255) ** 2;
			for (let channel = 0; channel < 3; channel += 1) {
				const value = channels[channel] + adjustments.shadows * shadowWeight + adjustments.highlights * highlightWeight;
				data[index + channel] = Math.max(0, Math.min(255, Math.round(value)));
			}
		}
		if (y % 96 === 0) emitProgress(id, y, height);
	}
	emitProgress(id, height, height);
	return new ImageData(data, width, height);
}

function extractPalette(id: string, task: Extract<ImageWorkerTask, { type: 'palette' }>): { hex: string; percentage: number }[] {
	const { data, width, height, colorCount } = task;
	if (data.length !== width * height * 4) throw new Error('The preview pixels are incomplete.');
	const bins = new Map<number, { red: number; green: number; blue: number; count: number }>();
	let total = 0;
	for (let index = 0; index < data.length; index += 4) {
		if (data[index + 3] < 32) continue;
		const red = data[index] >> 3;
		const green = data[index + 1] >> 3;
		const blue = data[index + 2] >> 3;
		const key = (red << 10) | (green << 5) | blue;
		const bin = bins.get(key);
		if (bin) bin.count += 1;
		else bins.set(key, { red: (red << 3) + 4, green: (green << 3) + 4, blue: (blue << 3) + 4, count: 1 });
		total += 1;
	}
	if (!total) throw new Error('This image has no visible pixels to sample.');
	type Color = { red: number; green: number; blue: number; count: number };
	type Box = { colors: Color[] };
	const boxes: Box[] = [{ colors: [...bins.values()] }];
	while (boxes.length < colorCount) {
		let selected = -1;
		let selectedScore = -1;
		for (let index = 0; index < boxes.length; index += 1) {
			const colors = boxes[index].colors;
			if (colors.length < 2) continue;
			const ranges = [0, 1, 2].map((channel) => {
				const values = colors.map((color) => channel === 0 ? color.red : channel === 1 ? color.green : color.blue);
				return Math.max(...values) - Math.min(...values);
			});
			const score = Math.max(...ranges) * colors.reduce((sum, color) => sum + color.count, 0);
			if (score > selectedScore) { selected = index; selectedScore = score; }
		}
		if (selected < 0) break;
		const box = boxes[selected];
		const ranges = [0, 1, 2].map((channel) => {
			const values = box.colors.map((color) => channel === 0 ? color.red : channel === 1 ? color.green : color.blue);
			return Math.max(...values) - Math.min(...values);
		});
		const channel = ranges.indexOf(Math.max(...ranges));
		box.colors.sort((a, b) => (channel === 0 ? a.red - b.red : channel === 1 ? a.green - b.green : a.blue - b.blue));
		const half = box.colors.reduce((sum, color) => sum + color.count, 0) / 2;
		let weight = 0;
		let split = 1;
		for (; split < box.colors.length; split += 1) {
			weight += box.colors[split - 1].count;
			if (weight >= half) break;
		}
		boxes.splice(selected, 1, { colors: box.colors.slice(0, split) }, { colors: box.colors.slice(split) });
		emitProgress(id, boxes.length, colorCount);
	}
	return boxes.map(({ colors }) => {
		let red = 0;
		let green = 0;
		let blue = 0;
		let count = 0;
		for (const color of colors) {
			red += color.red * color.count;
			green += color.green * color.count;
			blue += color.blue * color.count;
			count += color.count;
		}
		const hex = `#${[red, green, blue].map((value) => Math.round(value / count).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
		return { hex, percentage: count * 100 / total };
	}).sort((a, b) => b.percentage - a.percentage);
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
		if (task.type === 'palette') {
			const palette = extractPalette(id, task);
			workerScope.postMessage({ id, result: { data: new Uint8ClampedArray(), width: 0, height: 0, palette } });
			return;
		}
		const imageData = task.type === 'upscale'
			? resample(id, task)
			: task.type === 'sharpen'
				? sharpenImage(id, task)
				: task.type === 'denoise'
					? denoiseImage(id, task)
					: adjustImage(id, task);
		workerScope.postMessage({
			id,
			result: { data: imageData.data, width: imageData.width, height: imageData.height },
		}, [imageData.data.buffer]);
	} catch (error) {
		workerScope.postMessage({ id, error: error instanceof Error ? error.message : 'The image could not be processed.' });
	}
};
