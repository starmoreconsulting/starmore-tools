export const MOOD_BOARD_MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MOOD_BOARD_MAX_IMAGE_SIDE = 2048;
const LOW_MEMORY_IMAGE_BYTES = 3 * 1024 * 1024;

export function getDownscaledDimensions(width: number, height: number, maxSide = MOOD_BOARD_MAX_IMAGE_SIDE): { width: number; height: number } {
	if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) {
		throw new Error('The image has invalid dimensions.');
	}
	const scale = Math.min(1, maxSide / Math.max(width, height));
	return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

function isLowMemoryDevice(): boolean {
	if (typeof navigator === 'undefined') return false;
	const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
	return typeof deviceMemory === 'number'
		? deviceMemory <= 4
		: navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 4;
}

export function shouldRefuseLargeMoodBoardUpload(fileSize: number, lowMemoryDevice: boolean): boolean {
	return lowMemoryDevice && fileSize > LOW_MEMORY_IMAGE_BYTES;
}

export async function prepareMoodBoardImage(file: File): Promise<{ blob: Blob; dataUrl: string }> {
	if (file.size > MOOD_BOARD_MAX_IMAGE_BYTES) throw new Error('Mood board images must be 10 MB or smaller.');
	if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
		throw new Error('Choose a PNG, JPG, or WebP image.');
	}
	if (shouldRefuseLargeMoodBoardUpload(file.size, isLowMemoryDevice())) {
		throw new Error('This photo is too large to safely prepare on a low-memory device. Choose a smaller image or reduce it before uploading.');
	}
	let bitmap: ImageBitmap;
	try {
		bitmap = await createImageBitmap(file);
	} catch {
		throw new Error('This image could not be decoded. Choose a different PNG, JPG, or WebP file.');
	}
	try {
		const dimensions = getDownscaledDimensions(bitmap.width, bitmap.height);
		const canvas = document.createElement('canvas');
		canvas.width = dimensions.width;
		canvas.height = dimensions.height;
		const context = canvas.getContext('2d');
		if (!context) throw new Error('The browser could not prepare this image for local storage.');
		context.drawImage(bitmap, 0, 0, dimensions.width, dimensions.height);
		const blob = await new Promise<Blob>((resolve, reject) => {
			canvas.toBlob((result) => {
				if (result) resolve(result);
				else reject(new Error('The image could not be prepared for local storage.'));
			}, 'image/webp', 0.88);
		});
			if (blob.size > MOOD_BOARD_MAX_IMAGE_BYTES) throw new Error('The prepared image is still larger than 10 MB. Choose a smaller image.');
		const dataUrl = await new Promise<string>((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => typeof reader.result === 'string'
				? resolve(reader.result)
				: reject(new Error('The prepared image could not be read.'));
			reader.onerror = () => reject(new Error('The prepared image could not be read.'));
			reader.readAsDataURL(blob);
		});
		canvas.width = 0;
		canvas.height = 0;
		return { blob, dataUrl };
	} finally {
		bitmap.close();
	}
}
