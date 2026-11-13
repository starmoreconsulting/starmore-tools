import { checkImageDimensions } from './toolkit';
import type {
	BackgroundExportOptions,
	BackgroundFill,
	BrushStroke,
	MaskRefinement,
} from './background-engine';

interface WorkerRequest {
	id: string;
	type: 'rebuild' | 'refine' | 'export' | 'export-mask';
	file?: File;
	mask?: ArrayBuffer;
	maskWidth?: number;
	maskHeight?: number;
	strokes?: BrushStroke[];
	refinement?: MaskRefinement;
	options?: BackgroundExportOptions;
}

interface WorkerScope {
	postMessage(message: unknown, transfer?: Transferable[]): void;
	onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null;
}

const scope = self as unknown as WorkerScope;

function validateMask(request: WorkerRequest): { data: Uint8Array; width: number; height: number } {
	const { mask, maskWidth, maskHeight } = request;
	if (!mask || !maskWidth || !maskHeight || maskWidth * maskHeight !== mask.byteLength) {
		throw new Error('The editable mask data is incomplete.');
	}
	if (maskWidth > 2048 || maskHeight > 2048) {
		throw new Error('The editable mask exceeds the 2048 px working-size limit.');
	}
	return { data: new Uint8Array(mask), width: maskWidth, height: maskHeight };
}

function paintStroke(mask: Uint8Array, width: number, height: number, stroke: BrushStroke): void {
	const radius = Math.max(1, stroke.size / 2);
	const softness = Math.max(0, Math.min(1, stroke.softness));
	const hardRadius = radius * Math.max(0, Math.min(1, stroke.hardness / 100));
	const applyPoint = (point: { x: number; y: number }) => {
		const x0 = Math.max(0, Math.floor(point.x - radius));
		const x1 = Math.min(width - 1, Math.ceil(point.x + radius));
		const y0 = Math.max(0, Math.floor(point.y - radius));
		const y1 = Math.min(height - 1, Math.ceil(point.y + radius));
		for (let y = y0; y <= y1; y += 1) {
			for (let x = x0; x <= x1; x += 1) {
				const distance = Math.hypot(x - point.x, y - point.y);
				if (distance > radius) continue;
				const fadeStart = Math.min(hardRadius, radius * (1 - softness));
				const fadeRange = Math.max(1, radius - fadeStart);
				const coverage = distance <= fadeStart ? 1 : Math.max(0, (radius - distance) / fadeRange);
				const index = y * width + x;
				mask[index] = stroke.mode === 'erase'
					? Math.round(mask[index] * (1 - coverage))
					: Math.round(mask[index] + (255 - mask[index]) * coverage);
			}
		}
	};
	for (const point of stroke.points) applyPoint(point);
}

function boxBlur(source: Uint8Array, width: number, height: number, radius: number): Uint8Array {
	if (radius < 1) return source;
	const horizontal = new Uint8Array(source.length);
	const output = new Uint8Array(source.length);
	for (let y = 0; y < height; y += 1) {
		let sum = 0;
		for (let x = -radius; x <= radius; x += 1) {
			sum += source[y * width + Math.max(0, Math.min(width - 1, x))];
		}
		for (let x = 0; x < width; x += 1) {
			horizontal[y * width + x] = Math.round(sum / (radius * 2 + 1));
			sum -= source[y * width + Math.max(0, x - radius)];
			sum += source[y * width + Math.min(width - 1, x + radius + 1)];
		}
	}
	for (let x = 0; x < width; x += 1) {
		let sum = 0;
		for (let y = -radius; y <= radius; y += 1) {
			sum += horizontal[Math.max(0, Math.min(height - 1, y)) * width + x];
		}
		for (let y = 0; y < height; y += 1) {
			output[y * width + x] = Math.round(sum / (radius * 2 + 1));
			sum -= horizontal[Math.max(0, y - radius) * width + x];
			sum += horizontal[Math.min(height - 1, y + radius + 1) * width + x];
		}
	}
	return output;
}

function shiftMask(source: Uint8Array, width: number, height: number, amount: number): Uint8Array {
	const radius = Math.min(5, Math.round(Math.abs(amount)));
	if (radius < 1) return source;
	const output = new Uint8Array(source.length);
	for (let y = 0; y < height; y += 1) {
		for (let x = 0; x < width; x += 1) {
			let value = amount > 0 ? 0 : 255;
			for (let offset = -radius; offset <= radius; offset += 1) {
				const sample = source[y * width + Math.max(0, Math.min(width - 1, x + offset))];
				value = amount > 0 ? Math.max(value, sample) : Math.min(value, sample);
			}
			output[y * width + x] = value;
		}
	}
	const vertical = new Uint8Array(source.length);
	for (let y = 0; y < height; y += 1) {
		for (let x = 0; x < width; x += 1) {
			let value = amount > 0 ? 0 : 255;
			for (let offset = -radius; offset <= radius; offset += 1) {
				const sample = output[Math.max(0, Math.min(height - 1, y + offset)) * width + x];
				value = amount > 0 ? Math.max(value, sample) : Math.min(value, sample);
			}
			vertical[y * width + x] = value;
		}
	}
	return vertical;
}

function refineMask(
	data: Uint8Array,
	width: number,
	height: number,
	options: MaskRefinement,
): Uint8Array {
	const contrast = 0.5 + Math.max(0, Math.min(100, options.hardness)) / 50;
	let result = new Uint8Array(data.length);
	for (let i = 0; i < data.length; i += 1) {
		result[i] = Math.max(0, Math.min(255, Math.round((data[i] - 128) * contrast + 128)));
	}
	result = shiftMask(result, width, height, options.edgeShift);
	const radius = Math.min(10, Math.max(0, Math.round(options.feather)));
	return boxBlur(result, width, height, radius);
}

async function decode(file: File): Promise<ImageBitmap> {
	try {
		return await createImageBitmap(file, { imageOrientation: 'from-image' });
	} catch {
		try {
			return await createImageBitmap(file);
		} catch {
			throw new Error('This image could not be decoded. If it is HEIC/HEIF or an unusual format, convert it to JPG or PNG first.');
		}
	}
}

function makeMaskCanvas(data: Uint8Array, width: number, height: number): OffscreenCanvas {
	const canvas = new OffscreenCanvas(width, height);
	const context = canvas.getContext('2d');
	if (!context) throw new Error('The browser could not prepare the mask.');
	const pixels = new Uint8ClampedArray(data.length * 4);
	for (let index = 0; index < data.length; index += 1) {
		const offset = index * 4;
		pixels[offset] = pixels[offset + 1] = pixels[offset + 2] = 255;
		pixels[offset + 3] = data[index];
	}
	context.putImageData(new ImageData(pixels, width, height), 0, 0);
	return canvas;
}

function coverRect(
	imageWidth: number,
	imageHeight: number,
	width: number,
	height: number,
	focusX = 0.5,
	focusY = 0.5,
): [number, number, number, number] {
	const scale = Math.max(width / imageWidth, height / imageHeight);
	const drawWidth = imageWidth * scale;
	const drawHeight = imageHeight * scale;
	return [
		(width - drawWidth) * Math.max(0, Math.min(1, focusX)),
		(height - drawHeight) * Math.max(0, Math.min(1, focusY)),
		drawWidth,
		drawHeight,
	];
}

async function fillBackground(
	context: OffscreenCanvasRenderingContext2D,
	fill: BackgroundFill | undefined,
	source: ImageBitmap,
	width: number,
	height: number,
	fallbackColor: string,
): Promise<void> {
	if (!fill || fill.kind === 'transparent') return;
	if (fill.kind === 'solid') {
		context.fillStyle = fill.color;
		context.fillRect(0, 0, width, height);
		return;
	}
	if (fill.kind === 'gradient') {
		const gradient = context.createLinearGradient(0, 0, 0, height);
		gradient.addColorStop(0, fill.startColor);
		gradient.addColorStop(1, fill.endColor);
		context.fillStyle = gradient;
		context.fillRect(0, 0, width, height);
		return;
	}
	if (fill.kind === 'blurred') {
		context.fillStyle = fallbackColor;
		context.fillRect(0, 0, width, height);
		context.save();
		context.filter = `blur(${Math.max(0, Math.min(40, fill.blur))}px)`;
		const rect = coverRect(source.width, source.height, width + 80, height + 80);
		context.drawImage(source, rect[0] - 40, rect[1] - 40, rect[2], rect[3]);
		context.restore();
		return;
	}
	const backgroundBlob = new Blob([fill.bytes], { type: fill.type });
	let background: ImageBitmap;
	try {
		background = await createImageBitmap(backgroundBlob, { imageOrientation: 'from-image' });
	} catch {
		throw new Error('The selected background image could not be decoded. Choose a JPG, PNG, WebP, GIF or BMP image.');
	}
	try {
		checkImageDimensions(background.width, background.height);
		const rect = coverRect(background.width, background.height, width, height, fill.focusX, fill.focusY);
		context.drawImage(background, rect[0], rect[1], rect[2], rect[3]);
	} finally {
		background.close();
	}
}

async function exportImage(request: WorkerRequest, data: Uint8Array, maskWidth: number, maskHeight: number): Promise<Blob> {
	if (!request.file || !request.options) throw new Error('The image export request is incomplete.');
	const bitmap = await decode(request.file);
	try {
		checkImageDimensions(bitmap.width, bitmap.height);
		const width = request.options.outputWidth ?? bitmap.width;
		const height = request.options.outputHeight ?? bitmap.height;
		checkImageDimensions(width, height);
		const fill = request.options.format === 'image/jpeg'
			&& (!request.options.fill || request.options.fill.kind === 'transparent')
			? { kind: 'solid' as const, color: request.options.backgroundColor }
			: request.options.fill;
		const output = new OffscreenCanvas(width, height);
		const context = output.getContext('2d');
		if (!context) throw new Error('The browser could not prepare the export image.');
		await fillBackground(context, fill, bitmap, width, height, request.options.backgroundColor);

		const scale = Math.min(width / bitmap.width, height / bitmap.height);
		const drawWidth = bitmap.width * scale;
		const drawHeight = bitmap.height * scale;
		const x = (width - drawWidth) / 2;
		const y = (height - drawHeight) / 2;
		const maskCanvas = makeMaskCanvas(data, maskWidth, maskHeight);
		const subjectCanvas = new OffscreenCanvas(width, height);
		const subjectContext = subjectCanvas.getContext('2d');
		if (!subjectContext) throw new Error('The browser could not prepare the cutout.');
		subjectContext.imageSmoothingEnabled = true;
		subjectContext.imageSmoothingQuality = 'high';
		subjectContext.drawImage(bitmap, x, y, drawWidth, drawHeight);
		subjectContext.globalCompositeOperation = 'destination-in';
		subjectContext.imageSmoothingEnabled = true;
		subjectContext.imageSmoothingQuality = 'high';
		subjectContext.drawImage(maskCanvas, x, y, drawWidth, drawHeight);
		subjectContext.globalCompositeOperation = 'source-over';

		if (request.options.shadow) {
			context.save();
			context.shadowColor = 'rgba(0, 0, 0, 0.28)';
			context.shadowBlur = Math.max(8, Math.min(48, Math.max(width, height) * 0.025));
			context.shadowOffsetY = Math.max(3, Math.min(20, height * 0.01));
			context.drawImage(subjectCanvas, 0, 0);
			context.restore();
		}
		context.drawImage(subjectCanvas, 0, 0);
		const type = request.options.format;
		return await output.convertToBlob({ type, quality: Math.max(0.1, Math.min(1, request.options.quality)) });
	} finally {
		bitmap.close();
	}
}

async function exportMask(file: File, data: Uint8Array, maskWidth: number, maskHeight: number): Promise<Blob> {
	const bitmap = await decode(file);
	try {
		checkImageDimensions(bitmap.width, bitmap.height);
		const output = new OffscreenCanvas(bitmap.width, bitmap.height);
		const context = output.getContext('2d');
		if (!context) throw new Error('The browser could not prepare the mask export.');
		context.fillStyle = '#000';
		context.fillRect(0, 0, bitmap.width, bitmap.height);
		const maskCanvas = makeMaskCanvas(data, maskWidth, maskHeight);
		context.drawImage(maskCanvas, 0, 0, bitmap.width, bitmap.height);
		return await output.convertToBlob({ type: 'image/png' });
	} finally {
		bitmap.close();
	}
}

scope.onmessage = (event: MessageEvent<WorkerRequest>) => {
	const request = event.data;
	try {
		if (request.type === 'rebuild') {
			const { data, width, height } = validateMask(request);
			if (!request.strokes) throw new Error('The brush history is missing.');
			for (const stroke of request.strokes) paintStroke(data, width, height, stroke);
			scope.postMessage({ id: request.id, mask: data.buffer }, [data.buffer]);
			return;
		}
		if (request.type === 'refine') {
			const { data, width, height } = validateMask(request);
			if (!request.refinement) throw new Error('The mask refinement settings are missing.');
			const refined = refineMask(data, width, height, request.refinement);
			scope.postMessage({ id: request.id, mask: refined.buffer }, [refined.buffer]);
			return;
		}
		const { data, width, height } = validateMask(request);
		if (!request.file) throw new Error('Choose an image before exporting.');
		void (request.type === 'export'
			? exportImage(request, data, width, height)
			: exportMask(request.file, data, width, height))
			.then((blob) => scope.postMessage({ id: request.id, blob }))
			.catch((error: unknown) => {
				scope.postMessage({
					id: request.id,
					error: error instanceof Error ? error.message : 'The image export could not be completed.',
				});
			});
	} catch (error) {
		scope.postMessage({
			id: request.id,
			error: error instanceof Error ? error.message : 'Background processing could not be completed.',
		});
	}
};
