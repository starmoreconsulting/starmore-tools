export type SupportedImageType = 'image/jpeg' | 'image/png' | 'image/webp';

const imageTypes: Record<string, SupportedImageType> = {
	'image/jpeg': 'image/jpeg',
	'image/png': 'image/png',
	'image/webp': 'image/webp',
};

const imageExtensions: Record<string, SupportedImageType> = {
	jpg: 'image/jpeg',
	jpeg: 'image/jpeg',
	png: 'image/png',
	webp: 'image/webp',
};

export function getSupportedImageType(file: File): SupportedImageType | null {
	if (file.type in imageTypes) return imageTypes[file.type];
	const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
	return imageExtensions[extension] ?? null;
}

export function loadImage(file: File): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const url = URL.createObjectURL(file);
		const image = new Image();
		image.onload = () => {
			URL.revokeObjectURL(url);
			resolve(image);
		};
		image.onerror = () => {
			URL.revokeObjectURL(url);
			reject(new Error('The selected file could not be decoded as an image.'));
		};
		image.src = url;
	});
}

export function canvasToBlob(canvas: HTMLCanvasElement, type: SupportedImageType, quality?: number): Promise<Blob> {
	return new Promise((resolve, reject) => {
		canvas.toBlob((blob) => {
			if (blob) resolve(blob);
			else reject(new Error('Your browser could not create the image file.'));
		}, type, quality);
	});
}

export function formatFileSize(bytes: number): string {
	if (!Number.isFinite(bytes) || bytes < 0) return 'Unavailable';
	if (bytes < 1024) return `${bytes} B`;
	const units = ['KB', 'MB', 'GB'];
	let size = bytes / 1024;
	let unit = 0;
	while (size >= 1024 && unit < units.length - 1) {
		size /= 1024;
		unit += 1;
	}
	return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(size)} ${units[unit]}`;
}

export function getImageExtension(type: SupportedImageType): string {
	return type === 'image/jpeg' ? 'jpg' : type.slice('image/'.length);
}

export const MAX_IMAGE_PIXELS = 80_000_000;
