import { del, get, set } from 'idb-keyval';
import DOMPurify from 'dompurify';

const REFERENCE_PREFIX = 'logo-studio:reference:v1:';
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const MAX_DIMENSION = 2000;

export interface ReferenceLayer {
	blob: Blob;
	name: string;
	x: number;
	y: number;
	width: number;
	height: number;
	opacity: number;
	visible: boolean;
	locked: boolean;
}

function referenceKey(projectId: string): string {
	return `${REFERENCE_PREFIX}${projectId}`;
}

function fileDimensions(svg: string): { width: number; height: number } {
	const root = new DOMParser().parseFromString(svg, 'image/svg+xml').documentElement;
	const viewBox = root.getAttribute('viewBox')?.trim().split(/[\s,]+/).map(Number);
	if (viewBox?.length === 4 && viewBox.every(Number.isFinite) && viewBox[2] > 0 && viewBox[3] > 0) {
		return { width: viewBox[2], height: viewBox[3] };
	}
	const parseDimension = (value: string | null) => {
		const dimension = Number.parseFloat(value ?? '');
		return Number.isFinite(dimension) && dimension > 0 ? dimension : 512;
	};
	return { width: parseDimension(root.getAttribute('width')), height: parseDimension(root.getAttribute('height')) };
}

export function sanitizeReferenceSvg(contents: string): string {
	const clean = DOMPurify.sanitize(contents, {
		USE_PROFILES: { svg: true },
		FORBID_TAGS: ['script', 'foreignObject', 'image', 'style'],
		FORBID_ATTR: ['style'],
	});
	const document = new DOMParser().parseFromString(clean, 'image/svg+xml');
	if (document.querySelector('parsererror') || document.documentElement.localName !== 'svg') {
		throw new Error('This SVG could not be parsed. Choose a valid SVG file.');
	}
	for (const element of Array.from(document.querySelectorAll('*'))) {
		for (const attribute of Array.from(element.attributes)) {
			if (/^(?:href|xlink:href)$/i.test(attribute.name) && !attribute.value.startsWith('#')) {
				element.removeAttribute(attribute.name);
				continue;
			}
			const urls = Array.from(attribute.value.matchAll(/url\(\s*(['"]?)(.*?)\1\s*\)/gi));
			if (urls.some((match) => !match[2].trim().startsWith('#'))) {
				element.removeAttribute(attribute.name);
			}
		}
	}
	const svg = new XMLSerializer().serializeToString(document.documentElement);
	if (svg.length > MAX_UPLOAD_BYTES) throw new Error('The sanitised SVG is too large to keep as a reference.');
	return svg;
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
	return new Promise((resolve, reject) => {
		canvas.toBlob((blob) => {
			if (blob) resolve(blob);
			else reject(new Error('The image could not be converted for local storage.'));
		}, 'image/webp', 0.88);
	});
}

async function prepareRasterReference(file: File): Promise<{ blob: Blob; width: number; height: number }> {
	let bitmap: ImageBitmap;
	try {
		bitmap = await createImageBitmap(file);
	} catch {
		throw new Error('This image could not be decoded. Try a different PNG, JPG, or WebP file.');
	}
	try {
		const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
		const width = Math.max(1, Math.round(bitmap.width * scale));
		const height = Math.max(1, Math.round(bitmap.height * scale));
		const canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;
		const context = canvas.getContext('2d');
		if (!context) throw new Error('The browser could not prepare this image for local storage.');
		context.drawImage(bitmap, 0, 0, width, height);
		const blob = await canvasToBlob(canvas);
		canvas.width = 0;
		canvas.height = 0;
		return { blob, width, height };
	} finally {
		bitmap.close();
	}
}

export async function createReferenceFromFile(file: File, boardWidth: number, boardHeight: number): Promise<ReferenceLayer> {
	if (file.size > MAX_UPLOAD_BYTES) throw new Error('Reference files must be 10 MB or smaller.');
	const isSvg = file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg');
	const isRaster = ['image/png', 'image/jpeg', 'image/webp'].includes(file.type);
	if (!isSvg && !isRaster) throw new Error('Choose a PNG, JPG, WebP, or SVG reference image.');

	let blob: Blob;
	let sourceWidth: number;
	let sourceHeight: number;
	if (isSvg) {
		const contents = sanitizeReferenceSvg(await file.text());
		({ width: sourceWidth, height: sourceHeight } = fileDimensions(contents));
		blob = new Blob([contents], { type: 'image/svg+xml' });
	} else {
		({ blob, width: sourceWidth, height: sourceHeight } = await prepareRasterReference(file));
	}
	if (blob.size > MAX_UPLOAD_BYTES) throw new Error('The prepared reference image is still larger than 10 MB.');

	const scale = Math.min(1, boardWidth * 0.75 / sourceWidth, boardHeight * 0.75 / sourceHeight);
	const width = Math.max(1, sourceWidth * scale);
	const height = Math.max(1, sourceHeight * scale);
	return {
		blob,
		name: file.name.slice(0, 180) || 'Reference image',
		x: (boardWidth - width) / 2,
		y: (boardHeight - height) / 2,
		width,
		height,
		opacity: 0.45,
		visible: true,
		locked: false,
	};
}

export async function saveLocalReference(projectId: string, reference: ReferenceLayer): Promise<void> {
	await set(referenceKey(projectId), reference);
}

export async function loadLocalReference(projectId: string): Promise<ReferenceLayer | null> {
	const value = await get<unknown>(referenceKey(projectId));
	if (typeof value !== 'object' || value === null || !('blob' in value)) return null;
	const reference = value as Partial<ReferenceLayer>;
	if (!(reference.blob instanceof Blob)
		|| typeof reference.name !== 'string'
		|| ![reference.x, reference.y, reference.width, reference.height, reference.opacity].every((number) => typeof number === 'number' && Number.isFinite(number))
		|| typeof reference.visible !== 'boolean'
		|| typeof reference.locked !== 'boolean'
		|| (reference.blob.type !== 'image/webp' && reference.blob.type !== 'image/png' && reference.blob.type !== 'image/svg+xml')) {
		throw new Error('The saved reference image data is invalid.');
	}
	return reference as ReferenceLayer;
}

export async function deleteLocalReference(projectId: string): Promise<void> {
	await del(referenceKey(projectId));
}
