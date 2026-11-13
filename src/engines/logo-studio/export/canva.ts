import { strToU8, zipSync } from 'fflate';
import type { LogoProject } from '../model/types';
import { renderSvgToRaster } from './raster';
import { exportProjectToSvg } from './svg';
import { exportSvgToPdf } from './pdf';

const MAX_CANVA_PIXELS = 64_000_000;

export interface CanvaExportResult {
	blob: Blob;
	warnings: string[];
}

function blobDataUrl(blob: Blob): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => typeof reader.result === 'string'
			? resolve(reader.result)
			: reject(new Error('The simplified SVG image could not be encoded.'));
		reader.onerror = () => reject(new Error('The simplified SVG image could not be encoded.'));
		reader.readAsDataURL(blob);
	});
}

export async function exportCanvaReadyZip(
	project: LogoProject,
	simplifyForCanva = false,
): Promise<CanvaExportResult> {
	const width = project.artboard.width;
	const height = project.artboard.height;
	if (!Number.isFinite(width) || width < 1 || !Number.isFinite(height) || height < 1) {
		throw new Error('The artboard has invalid dimensions for Canva export.');
	}
	if (width * height * 16 > MAX_CANVA_PIXELS) {
		throw new Error('Canva-ready 4× exports are limited to 64 million pixels. Reduce the artboard dimensions and try again.');
	}

	const result = await exportProjectToSvg(project, { outlineText: true, background: 'transparent' });
	let svg = result.svg;
	const warnings = [...result.warnings];
	const png = await renderSvgToRaster(svg, { width, height, format: 'png', scale: 4 });

	if (simplifyForCanva) {
		const dataUrl = await blobDataUrl(png.blob);
		svg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><image width="${width}" height="${height}" href="${dataUrl}" preserveAspectRatio="none"/></svg>`;
		const changed = [
			'Flattened all vector artwork into an embedded transparent 4× PNG in logo.svg; the SVG is no longer resolution-independent.',
			'Baked gradients, opacity, rotation, and any shadows, filters, or masks into the image.',
			'Text, shapes, and icons are no longer separate editable vectors in the simplified SVG.',
		];
		warnings.push(...changed);
	}

	const pdf = await exportSvgToPdf(svg, width, height);
	const archive = zipSync({
		'logo.svg': strToU8(svg),
		'logo.pdf': new Uint8Array(await pdf.arrayBuffer()),
		'logo.png': new Uint8Array(await png.blob.arrayBuffer()),
		'README.txt': strToU8([
			'Canva-ready logo files',
			'',
			'Upload logo.svg to Canva for scalable artwork when Canva supports its SVG features.',
			'Upload logo.pdf when you need a print-sized vector file.',
			'Upload logo.png for a transparent 4× raster version.',
			'',
			simplifyForCanva
				? 'Simplify for Canva was enabled. The SVG contains a flattened transparent 4× PNG for broader import compatibility.'
				: 'Simplify for Canva was not enabled. The SVG keeps editable vector paths and effects where supported.',
			'Canva import behaviour and supported SVG features may change; review the imported result before publishing.',
			'All files were generated locally in your browser.',
		].join('\n')),
	}, { level: 6 });
	return { blob: new Blob([new Uint8Array(archive)], { type: 'application/zip' }), warnings };
}
