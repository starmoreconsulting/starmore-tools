import { writePsdUint8Array, type Layer, type Psd } from 'ag-psd';
import type { Element, LogoProject } from '../model/types';
import { renderSvgToRaster } from './raster';
import { exportProjectToSvg } from './svg';

export const MAX_PSD_LAYER_PIXELS = 64_000_000;

export interface PsdExportOptions {
	includeArtboardBackground?: boolean;
}

interface CroppedPixels {
	left: number;
	top: number;
	imageData: ImageData;
}

async function rasterizeSvg(svg: string, width: number, height: number): Promise<CroppedPixels> {
	const result = await renderSvgToRaster(svg, { width, height, format: 'png', scale: 2 });
	const bitmap = await createImageBitmap(result.blob);
	const canvas = document.createElement('canvas');
	canvas.width = result.width;
	canvas.height = result.height;
	const context = canvas.getContext('2d', { willReadFrequently: true });
	if (!context) throw new Error('Your browser could not create the PSD layer image.');
	try {
		context.drawImage(bitmap, 0, 0);
		const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
		let left = canvas.width;
		let top = canvas.height;
		let right = -1;
		let bottom = -1;
		for (let y = 0; y < pixels.height; y += 1) {
			for (let x = 0; x < pixels.width; x += 1) {
				if (pixels.data[(y * pixels.width + x) * 4 + 3] === 0) continue;
				left = Math.min(left, x);
				top = Math.min(top, y);
				right = Math.max(right, x);
				bottom = Math.max(bottom, y);
			}
		}
		if (right < left || bottom < top) {
			return { left: 0, top: 0, imageData: new ImageData(1, 1) };
		}
		return {
			left,
			top,
			imageData: context.getImageData(left, top, right - left + 1, bottom - top + 1),
		};
	} finally {
		bitmap.close();
		canvas.width = 0;
		canvas.height = 0;
	}
}

function layerName(element: Element): string {
	return element.name?.trim().slice(0, 255) || `${element.type[0].toUpperCase()}${element.type.slice(1)}`;
}

function visibleClone(element: Element): Element {
	const clone = structuredClone(element);
	clone.visible = true;
	return clone;
}

async function renderElementLayer(project: LogoProject, element: Element, documentWidth: number, documentHeight: number): Promise<Layer> {
	const layerElement = visibleClone(element);
	const layerProject: LogoProject = {
		...project,
		artboard: { ...project.artboard, background: 'transparent' },
		variants: { primary: [layerElement] },
	};
	const svg = await exportProjectToSvg(layerProject, { outlineText: true, background: 'transparent' });
	const pixels = await rasterizeSvg(svg.svg, project.artboard.width, project.artboard.height);
	const rasterLayer: Layer = {
		name: element.type === 'group' ? `${layerName(element)} artwork` : layerName(element),
		left: pixels.left,
		top: pixels.top,
		right: pixels.left + pixels.imageData.width,
		bottom: pixels.top + pixels.imageData.height,
		imageData: pixels.imageData,
		hidden: false,
	};
	if (element.type !== 'group') {
		rasterLayer.hidden = !element.visible;
		return rasterLayer;
	}
	return {
		name: layerName(element),
		left: 0,
		top: 0,
		right: documentWidth,
		bottom: documentHeight,
		hidden: !element.visible,
		opened: true,
		children: [rasterLayer],
	};
}

async function renderBackground(project: LogoProject, documentWidth: number, documentHeight: number): Promise<Layer | null> {
	const background = project.artboard.background;
	if (background === 'transparent') return null;
	if (!/^#[\da-f]{3,8}$/i.test(background)) {
		throw new Error('The artboard background must be a solid hex colour for PSD export.');
	}
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${project.artboard.width}" height="${project.artboard.height}" viewBox="0 0 ${project.artboard.width} ${project.artboard.height}"><rect width="100%" height="100%" fill="${background}"/></svg>`;
	const pixels = await rasterizeSvg(svg, project.artboard.width, project.artboard.height);
	return {
		name: 'Artboard background',
		left: 0,
		top: 0,
		right: documentWidth,
		bottom: documentHeight,
		imageData: pixels.imageData,
	};
}

export async function exportProjectToPsd(
	project: LogoProject,
	options: PsdExportOptions = {},
): Promise<Uint8Array> {
	const elements = project.variants.primary ?? [];
	const width = Math.round(project.artboard.width * 2);
	const height = Math.round(project.artboard.height * 2);
	if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1 || width > 30_000 || height > 30_000) {
		throw new Error('The artboard dimensions exceed PSD limits.');
	}
	const layerCount = elements.length + (options.includeArtboardBackground ? 1 : 0);
	const estimatedPixels = width * height * layerCount;
	if (estimatedPixels > MAX_PSD_LAYER_PIXELS) {
		throw new Error(`Layered PSD export is limited to ${MAX_PSD_LAYER_PIXELS.toLocaleString()} total 2× layer pixels. Reduce the artboard size or visible layer count and try again.`);
	}
	if (elements.length === 0 && !options.includeArtboardBackground) {
		throw new Error('Add a visible logo layer or include the artboard background before exporting a PSD.');
	}

	const layers: Layer[] = [];
	for (const element of elements) {
		layers.push(await renderElementLayer(project, element, width, height));
	}
	const background = options.includeArtboardBackground
		? await renderBackground(project, width, height)
		: null;
	const psd: Psd = {
		width,
		height,
		bitsPerChannel: 8,
		colorMode: 3,
		children: [...layers.reverse(), ...(background ? [background] : [])],
	};
	return writePsdUint8Array(psd);
}
