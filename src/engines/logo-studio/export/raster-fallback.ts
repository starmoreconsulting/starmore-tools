import { choosePrintRasterScale, getCurrentPrintRasterLimits } from '../../brand-studio/export/print-raster-scale';
import { renderSvgToRaster } from './raster';

export interface UnsupportedTextRasterFallback {
	rasterDataUrl: string;
	effectiveDpi: number;
}

function blobDataUrl(blob: Blob): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => {
			if (typeof reader.result === 'string') resolve(reader.result);
			else reject(new Error('The print artwork could not be prepared for PDF export.'));
		};
		reader.onerror = () => reject(new Error('The print artwork could not be prepared for PDF export.'));
		reader.readAsDataURL(blob);
	});
}

export async function rasterizeSvgForPrintFallback(
	svg: string,
	widthMm: number,
	heightMm: number,
): Promise<UnsupportedTextRasterFallback> {
	const choice = choosePrintRasterScale(widthMm, heightMm, getCurrentPrintRasterLimits());
	const { blob } = await renderSvgToRaster(svg, {
		width: choice.width,
		height: choice.height,
		format: 'png',
		scale: 1,
	});
	return {
		rasterDataUrl: await blobDataUrl(blob),
		effectiveDpi: choice.effectiveDpi,
	};
}

export function printDimensionsToMm(
	width: number,
	height: number,
	unit: 'mm' | 'in' | 'px',
): { widthMm: number; heightMm: number } {
	const multiplier = unit === 'mm' ? 1 : unit === 'in' ? 25.4 : 25.4 / 72;
	return { widthMm: width * multiplier, heightMm: height * multiplier };
}
