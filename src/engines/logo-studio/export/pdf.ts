import type { Svg2pdfOptions } from 'svg2pdf.js';
import { renderSvgToRaster } from './raster';

export async function exportSvgToPdf(svg: string, width: number, height: number): Promise<Blob> {
	if (!Number.isFinite(width) || width < 1 || !Number.isFinite(height) || height < 1) {
		throw new Error('The artboard has invalid dimensions for a PDF export.');
	}

	const document = new DOMParser().parseFromString(svg, 'image/svg+xml');
	if (document.querySelector('parsererror')) {
		throw new Error('The SVG could not be opened to create the PDF.');
	}
	const svgElement = document.documentElement as unknown as SVGSVGElement;
	const [{ jsPDF }] = await Promise.all([
		import('jspdf'),
		import('svg2pdf.js/dist/svg2pdf.es.min.js'),
	]);
	const pdf = new jsPDF({
		orientation: width >= height ? 'landscape' : 'portrait',
		unit: 'pt',
		format: [width, height],
		compress: true,
	});

	const options: Svg2pdfOptions = { x: 0, y: 0, width, height };
	if (document.querySelector('filter feDropShadow')) {
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
		await pdf.svg(svgElement, options);
	}
	return pdf.output('blob');
}
