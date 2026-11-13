export type ImageOutputType = 'image/png' | 'image/jpeg' | 'image/webp';
export type ImageInputType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' | 'image/bmp';
export type ResampleMode = 'photo' | 'pixel-art';

export interface DecodedImage {
	bitmap: ImageBitmap;
	width: number;
	height: number;
	type: ImageInputType;
}

export interface ImageLimits {
	maxPixels: number;
	maxSide: number;
}

export interface WorkerProgress {
	completed: number;
	total: number;
}

export type ImageWorkerTask = {
	type: 'upscale';
	data: Uint8ClampedArray;
	width: number;
	height: number;
	outputWidth: number;
	outputHeight: number;
	mode: ResampleMode;
	sharpen: number;
} | {
	type: 'sharpen';
	data: Uint8ClampedArray;
	width: number;
	height: number;
	amount: number;
	radius: number;
	threshold: number;
	contrast: number;
} | {
	type: 'denoise';
	data: Uint8ClampedArray;
	width: number;
	height: number;
	luminanceStrength: number;
	colorStrength: number;
} | {
	type: 'adjust';
	data: Uint8ClampedArray;
	width: number;
	height: number;
	adjustments: {
		brightness: number;
		contrast: number;
		exposure: number;
		saturation: number;
		vibrance: number;
		temperature: number;
		tint: number;
		highlights: number;
		shadows: number;
		autoStretch: boolean;
	};
};

export interface ImageWorkerResult {
	data: Uint8ClampedArray;
	width: number;
	height: number;
}

const MIME_BY_EXTENSION: Record<string, ImageInputType> = {
	jpg: 'image/jpeg',
	jpeg: 'image/jpeg',
	png: 'image/png',
	webp: 'image/webp',
	gif: 'image/gif',
	bmp: 'image/bmp',
};
const ACCEPTED_TYPES = new Set<ImageInputType>(Object.values(MIME_BY_EXTENSION));

export function getImageLimits(): ImageLimits {
	const agent = typeof navigator === 'undefined' ? '' : `${navigator.userAgent} ${navigator.platform}`;
	const iosOrIpad = /iPhone|iPad|iPod/i.test(agent)
		|| (typeof navigator !== 'undefined' && navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
	const lowMemory = typeof navigator !== 'undefined'
		&& 'deviceMemory' in navigator
		&& Number((navigator as Navigator & { deviceMemory?: number }).deviceMemory) <= 4;
	return { maxPixels: iosOrIpad || lowMemory ? 16_777_216 : 48_000_000, maxSide: 12_000 };
}

export function checkImageDimensions(width: number, height: number): void {
	const { maxPixels, maxSide } = getImageLimits();
	if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1) {
		throw new Error('The image has invalid pixel dimensions.');
	}
	if (width > maxSide || height > maxSide || width * height > maxPixels) {
		throw new Error(`This image exceeds the current limit of ${maxPixels.toLocaleString()} pixels or ${maxSide.toLocaleString()} px per side. Try a smaller image or reduce the output dimensions.`);
	}
}

export function getImageInputType(file: File): ImageInputType {
	const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
	if (extension === 'heic' || extension === 'heif' || file.type === 'image/heic' || file.type === 'image/heif') {
		throw new Error('HEIC and HEIF images are not supported by this browser tool. Convert the image to JPG or PNG first, then try again.');
	}
	const inferred = MIME_BY_EXTENSION[extension];
	const type = ACCEPTED_TYPES.has(file.type as ImageInputType) ? file.type as ImageInputType : inferred;
	if (!type || !ACCEPTED_TYPES.has(type)) {
		throw new Error('Choose a JPG, PNG, WebP, GIF or BMP image. If your browser cannot decode the file, convert it to JPG or PNG first.');
	}
	return type;
}

export async function decodeImageFile(file: File): Promise<DecodedImage> {
	const type = getImageInputType(file);
	try {
		if (typeof createImageBitmap === 'function') {
			const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
			try {
				checkImageDimensions(bitmap.width, bitmap.height);
			} catch (error) {
				bitmap.close();
				throw error;
			}
			return { bitmap, width: bitmap.width, height: bitmap.height, type };
		}
		const bitmap = await decodeWithImageElement(file);
		try {
			checkImageDimensions(bitmap.width, bitmap.height);
		} catch (error) {
			bitmap.close();
			throw error;
		}
		return { bitmap, width: bitmap.width, height: bitmap.height, type };
	} catch (error) {
		if (error instanceof Error && (error.message.includes('exceeds the current limit') || error.message.includes('HEIC and HEIF'))) throw error;
		throw new Error('This image could not be decoded by the browser. If it is HEIC/HEIF or an unusual format, convert it to JPG or PNG first.');
	}
}

async function decodeWithImageElement(file: File): Promise<ImageBitmap> {
	const url = URL.createObjectURL(file);
	try {
		const image = await new Promise<HTMLImageElement>((resolve, reject) => {
			const element = new Image();
			element.onload = () => resolve(element);
			element.onerror = () => reject(new Error('Could not decode image.'));
			element.src = url;
		});
		return await createImageBitmap(image);
	} finally {
		URL.revokeObjectURL(url);
	}
}

export function createCanvas(width: number, height: number, offscreen = false): HTMLCanvasElement | OffscreenCanvas {
	checkImageDimensions(width, height);
	const canvas = offscreen && typeof OffscreenCanvas !== 'undefined'
		? new OffscreenCanvas(width, height)
		: document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	return canvas;
}

export function drawDecodedImage(image: DecodedImage, width = image.width, height = image.height): HTMLCanvasElement {
	const canvas = createCanvas(width, height) as HTMLCanvasElement;
	const context = canvas.getContext('2d', { willReadFrequently: true });
	if (!context) throw new Error('Your browser could not prepare the image canvas.');
	context.drawImage(image.bitmap, 0, 0, width, height);
	return canvas;
}

export function canvasToBlob(canvas: HTMLCanvasElement, type: ImageOutputType, quality = 0.92): Promise<Blob> {
	return new Promise((resolve, reject) => {
		canvas.toBlob((blob) => {
			if (blob) resolve(blob);
			else reject(new Error(`Your browser could not encode this image as ${type.slice('image/'.length).toUpperCase()}.`));
		}, type, type === 'image/png' ? undefined : Math.min(1, Math.max(0.1, quality)));
	});
}

export async function exportImage(canvas: HTMLCanvasElement, type: ImageOutputType, quality = 0.92, jpgBackground = '#ffffff'): Promise<Blob> {
	if (type === 'image/jpeg') {
		const flattened = createCanvas(canvas.width, canvas.height) as HTMLCanvasElement;
		const context = flattened.getContext('2d');
		if (!context) throw new Error('Your browser could not prepare the JPG canvas.');
		context.fillStyle = jpgBackground;
		context.fillRect(0, 0, flattened.width, flattened.height);
		context.drawImage(canvas, 0, 0);
		try {
			return await canvasToBlob(flattened, type, quality);
		} finally {
			flattened.width = 0;
			flattened.height = 0;
		}
	}
	return canvasToBlob(canvas, type, quality);
}

export function formatImageBytes(bytes: number): string {
	if (!Number.isFinite(bytes) || bytes < 0) return 'Unavailable';
	if (bytes < 1024) return `${bytes} B`;
	const units = ['KB', 'MB', 'GB'];
	let size = bytes / 1024;
	let index = 0;
	while (size >= 1024 && index < units.length - 1) {
		size /= 1024;
		index += 1;
	}
	return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(size)} ${units[index]}`;
}

export function estimateImageBytes(width: number, height: number, type: ImageOutputType, quality: number): number {
	const pixels = Math.max(0, width * height);
	if (type === 'image/png') return Math.round(pixels * 1.4);
	return Math.round(pixels * (type === 'image/jpeg' ? 0.16 : 0.12) * Math.max(0.25, quality));
}

export function downloadImage(blob: Blob, filename: string): void {
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = filename;
	link.click();
	window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function runImageWorker(task: ImageWorkerTask, onProgress?: (progress: WorkerProgress) => void): Promise<ImageWorkerResult> {
	return new Promise((resolve, reject) => {
		const worker = new Worker(new URL('./image.worker.ts', import.meta.url), { type: 'module' });
		const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
		worker.onmessage = (event: MessageEvent<{ id: string; progress?: WorkerProgress; result?: ImageWorkerResult; error?: string }>) => {
			if (event.data.id !== id) return;
			if (event.data.progress) {
				onProgress?.(event.data.progress);
				return;
			}
			worker.terminate();
			if (event.data.error) reject(new Error(event.data.error));
			else if (event.data.result) resolve(event.data.result);
			else reject(new Error('Image processing returned no result.'));
		};
		worker.onerror = () => {
			worker.terminate();
			reject(new Error('Image processing stopped unexpectedly. Try a smaller image.'));
		};
		const transferable = task.data.buffer;
		worker.postMessage({ id, task }, [transferable]);
	});
}

export async function canvasToImageData(canvas: HTMLCanvasElement): Promise<ImageData> {
	const context = canvas.getContext('2d', { willReadFrequently: true });
	if (!context) throw new Error('Your browser could not read image pixels.');
	return context.getImageData(0, 0, canvas.width, canvas.height);
}

export function createImageUrl(file: File): string {
	return URL.createObjectURL(file);
}
