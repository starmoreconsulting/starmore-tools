import type { Svg2pdfOptions } from 'svg2pdf.js';
import { renderSvgToRaster } from './raster';

export interface SvgPdfPage {
	svg: string;
	width: number;
	height: number;
}

export async function exportSvgPagesToPdf(pages: SvgPdfPage[]): Promise<Blob> {
	if (!pages.length) throw new Error('Choose at least one mockup for the brand presentation.');
	const [{ jsPDF }] = await Promise.all([
		import('jspdf'),
		import('svg2pdf.js/dist/svg2pdf.es.min.js'),
	]);
	let pdf: InstanceType<typeof jsPDF> | null = null;
	for (const page of pages) {
		const { svg, width, height } = page;
		if (!Number.isFinite(width) || width < 1 || !Number.isFinite(height) || height < 1) {
			throw new Error('A mockup has invalid dimensions for a PDF export.');
		}
		const document = new DOMParser().parseFromString(svg, 'image/svg+xml');
		if (document.querySelector('parsererror')) {
			throw new Error('A mockup SVG could not be opened to create the PDF.');
		}
		if (!pdf) {
			pdf = new jsPDF({
				orientation: width >= height ? 'landscape' : 'portrait',
				unit: 'pt',
				format: [width, height],
				compress: true,
			});
		} else {
			pdf.addPage([width, height], width >= height ? 'landscape' : 'portrait');
		}
		const options: Svg2pdfOptions = { x: 0, y: 0, width, height };
		if (document.querySelector('filter feDropShadow, filter feGaussianBlur')) {
			const scale = width * 2 <= 4000 && height * 2 <= 4000 ? 2 : 1;
			const { blob } = await renderSvgToRaster(svg, { width, height, format: 'png', scale });
			const dataUri = await new Promise<string>((resolve, reject) => {
				const reader = new FileReader();
				reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('The PDF shadow fallback could not read the raster image.'));
				reader.onerror = () => reject(new Error('The PDF shadow fallback could not read the raster image.'));
				reader.readAsDataURL(blob);
			});
			pdf.addImage(dataUri, 'PNG', 0, 0, width, height);
		} else {
			const svgElement = document.documentElement as unknown as SVGSVGElement;
			await pdf.svg(svgElement, options);
		}
	}
	if (!pdf) throw new Error('The brand presentation could not be created.');
	return pdf.output('blob');
}

export async function exportSvgToPdf(svg: string, width: number, height: number): Promise<Blob> {
	if (!Number.isFinite(width) || width < 1 || !Number.isFinite(height) || height < 1) {
		throw new Error('The artboard has invalid dimensions for a PDF export.');
	}
	return exportSvgPagesToPdf([{ svg, width, height }]);
}
