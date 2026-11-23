import { zipSync } from 'fflate';
import { canvasToBlob, getImageExtension, loadImage, MAX_IMAGE_PIXELS, type SupportedImageType } from './image';

export type BatchImageFormat = SupportedImageType;

export type BatchImageOptions = {
	maxWidth: number;
	maxHeight: number;
	format: BatchImageFormat;
	quality: number;
};

export type BatchImageOutput = {
	name: string;
	blob: Blob;
};

const rasterExtensions = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'avif']);
const rasterMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp', 'image/avif']);

export const MAX_BATCH_FILES = 50;
export const MAX_INPUT_FILE_BYTES = 100 * 1024 * 1024;
export const MAX_OUTPUT_BYTES = 200 * 1024 * 1024;
export const MAX_ARCHIVE_BYTES = 64 * 1024 * 1024;
const MAX_OUTPUT_PIXELS = 40_000_000;

export function validateBatchImageOptions(options: BatchImageOptions): string | null {
	if (!Number.isInteger(options.maxWidth) || options.maxWidth < 1 || options.maxWidth > 20_000) {
		return 'Maximum width must be a whole number between 1 and 20,000 pixels.';
	}
	if (!Number.isInteger(options.maxHeight) || options.maxHeight < 1 || options.maxHeight > 20_000) {
		return 'Maximum height must be a whole number between 1 and 20,000 pixels.';
	}
	if (!['image/jpeg', 'image/png', 'image/webp'].includes(options.format)) {
		return 'Choose JPG, PNG, or WebP as the output format.';
	}
	if (!Number.isInteger(options.quality) || options.quality < 10 || options.quality > 100) {
		return 'Quality must be a whole number between 10 and 100.';
	}
	return null;
}

export function isSupportedRasterImage(file: Pick<File, 'name' | 'type'>): boolean {
	const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
	if (file.type === 'image/svg+xml' || extension === 'svg') return false;
	return rasterMimeTypes.has(file.type) || (!file.type && rasterExtensions.has(extension)) || rasterExtensions.has(extension);
}

export function calculateOutputDimensions(width: number, height: number, options: Pick<BatchImageOptions, 'maxWidth' | 'maxHeight'>): { width: number; height: number } {
	if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
		throw new Error('The image has invalid dimensions.');
	}
	const scale = Math.min(
		1,
		options.maxWidth / width,
		options.maxHeight / height,
		Math.sqrt(MAX_OUTPUT_PIXELS / (width * height)),
	);
	return {
		width: Math.max(1, Math.floor(width * scale)),
		height: Math.max(1, Math.floor(height * scale)),
	};
}

export function createOutputFilename(fileName: string, format: BatchImageFormat, usedNames: Set<string> = new Set()): string {
	const leafName = fileName.split(/[\\/]/).pop() ?? '';
	const base = leafName.replace(/\.[^.]*$/, '')
		.replace(/[\u0000-\u001f<>:"/\\|?*]/g, '-')
		.replace(/[. ]+$/g, '')
		.trim()
		.slice(0, 100) || 'image';
	const extension = getImageExtension(format);
	const candidate = `${base}-optimized.${extension}`;
	let unique = candidate;
	let suffix = 2;
	while (usedNames.has(unique.toLowerCase())) {
		unique = `${base}-optimized-${suffix}.${extension}`;
		suffix += 1;
	}
	usedNames.add(unique.toLowerCase());
	return unique;
}

export async function optimizeImageFile(file: File, options: BatchImageOptions): Promise<Blob> {
	const validationError = validateBatchImageOptions(options);
	if (validationError) throw new Error(validationError);
	if (!isSupportedRasterImage(file)) throw new Error('Unsupported file type. Choose a JPG, PNG, WebP, GIF, BMP, or AVIF image.');
	if (file.size > MAX_INPUT_FILE_BYTES) throw new Error('This file is larger than the 100 MB per-image limit.');

	const image = await loadImage(file);
	const sourceWidth = image.naturalWidth;
	const sourceHeight = image.naturalHeight;
	const sourcePixels = sourceWidth * sourceHeight;
	if (!Number.isFinite(sourcePixels) || sourcePixels <= 0 || sourcePixels > MAX_IMAGE_PIXELS) {
		throw new Error('This image is too large to process safely in the browser (maximum 80 megapixels).');
	}

	const dimensions = calculateOutputDimensions(sourceWidth, sourceHeight, options);
	const canvas = document.createElement('canvas');
	canvas.width = dimensions.width;
	canvas.height = dimensions.height;
	try {
		const context = canvas.getContext('2d');
		if (!context) throw new Error('Your browser could not prepare the image canvas.');
		if (options.format === 'image/jpeg') {
			context.fillStyle = '#ffffff';
			context.fillRect(0, 0, canvas.width, canvas.height);
		}
		context.drawImage(image, 0, 0, canvas.width, canvas.height);
		const blob = await canvasToBlob(canvas, options.format, options.format === 'image/png' ? undefined : options.quality / 100);
		if (blob.type !== options.format) {
			throw new Error(`Your browser could not encode this image as ${getImageExtension(options.format).toUpperCase()}.`);
		}
		return blob;
	} finally {
		canvas.width = 0;
		canvas.height = 0;
	}
}

export async function createImageZip(outputs: BatchImageOutput[]): Promise<Blob> {
	if (!outputs.length) throw new Error('There are no successful images to add to a ZIP.');
	const totalBytes = outputs.reduce((total, output) => total + output.blob.size, 0);
	if (totalBytes > MAX_ARCHIVE_BYTES) throw new Error('The combined output is too large for a browser ZIP. Download the files individually instead.');
	const archive: Record<string, Uint8Array> = {};
	for (const output of outputs) {
		archive[output.name] = new Uint8Array(await output.blob.arrayBuffer());
	}
	return new Blob([zipSync(archive, { level: 5 })], { type: 'application/zip' });
}
