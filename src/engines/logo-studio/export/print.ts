import type { Svg2pdfOptions } from 'svg2pdf.js';

export type PrintUnit = 'mm' | 'in' | 'px';
export type PrintPreset = 'screen' | 'standard' | 'custom';

export interface PrintPdfPage {
	svg: string;
	width: number;
	height: number;
	unit: PrintUnit;
	background?: string;
}

export interface PrintPdfOptions {
	preset?: PrintPreset;
	bleedMm?: number;
	cropMarks?: boolean;
	extendBackgroundColourIntoBleed?: boolean;
}

export interface PrintPdfPageSize {
	widthPt: number;
	heightPt: number;
}

export interface PrintPdfResult {
	blob: Blob;
	pageSizes: PrintPdfPageSize[];
}

const PT_PER_IN = 72;
const MM_PER_IN = 25.4;
const CROP_GAP_MM = 1;
const CROP_LENGTH_MM = 5;
const CROP_STROKE_PT = 0.25;

function toPoints(value: number, unit: PrintUnit): number {
	return unit === 'px' ? value : unit === 'in' ? value * PT_PER_IN : value * PT_PER_IN / MM_PER_IN;
}

function mmToPoints(value: number): number {
	return value * PT_PER_IN / MM_PER_IN;
}

function resolvedBleed(options: PrintPdfOptions): number {
	if (options.preset === 'screen') return 0;
	if (options.preset === 'standard') return 3;
	const bleed = options.bleedMm ?? 0;
	if (!Number.isFinite(bleed) || bleed < 0 || bleed > 10) {
		throw new Error('Custom bleed must be between 0 and 10 mm.');
	}
	return bleed;
}

function isSolidColour(value: string | undefined): value is string {
	return Boolean(value && value !== 'transparent' && /^#[\da-f]{3,8}$/i.test(value));
}

function parsePageSvg(svg: string): SVGSVGElement {
	const parsed = new DOMParser().parseFromString(svg, 'image/svg+xml');
	if (parsed.querySelector('parsererror') || parsed.documentElement.localName !== 'svg') {
		throw new Error('A print page contains invalid SVG.');
	}
	if (parsed.querySelector('text')) {
		throw new Error('Convert text to outlines before creating a print PDF.');
	}
	return parsed.documentElement as unknown as SVGSVGElement;
}

function drawCropMarks(
	pdf: InstanceType<typeof import('jspdf').jsPDF>,
	trimX: number,
	trimY: number,
	trimWidth: number,
	trimHeight: number,
	bleed: number,
): void {
	const gap = mmToPoints(CROP_GAP_MM);
	const length = mmToPoints(CROP_LENGTH_MM);
	const inset = bleed + gap;
	const outer = inset + length;
	pdf.setDrawColor(0, 0, 0);
	pdf.setLineWidth(CROP_STROKE_PT);
	for (const [x, directionX] of [[trimX, -1], [trimX + trimWidth, 1]] as const) {
		for (const [y, directionY] of [[trimY, -1], [trimY + trimHeight, 1]] as const) {
			pdf.line(x + directionX * inset, y, x + directionX * outer, y);
			pdf.line(x, y + directionY * inset, x, y + directionY * outer);
		}
	}
}

/**
 * Creates a vector PDF from outlined SVG pages. Pixel dimensions use 1 px = 1 pt,
 * preserving their exact aspect ratio and numeric dimensions in the PDF.
 */
export async function exportPrintPdf(
	pages: readonly PrintPdfPage[],
	options: PrintPdfOptions = {},
): Promise<PrintPdfResult> {
	if (pages.length === 0) throw new Error('Choose at least one page for the print PDF.');
	const bleedMm = resolvedBleed(options);
	const bleed = mmToPoints(bleedMm);
	const cropMarks = options.preset === 'screen' ? false : options.preset === 'standard' ? true : options.cropMarks ?? false;
	const markMargin = cropMarks ? mmToPoints(CROP_GAP_MM + CROP_LENGTH_MM) : 0;
	const sizes = pages.map((page) => {
		if (!Number.isFinite(page.width) || page.width <= 0 || !Number.isFinite(page.height) || page.height <= 0) {
			throw new Error('A print page has invalid dimensions.');
		}
		const width = toPoints(page.width, page.unit);
		const height = toPoints(page.height, page.unit);
		return { widthPt: width + 2 * (bleed + markMargin), heightPt: height + 2 * (bleed + markMargin) };
	});

	const [{ jsPDF }] = await Promise.all([
		import('jspdf'),
		import('svg2pdf.js/dist/svg2pdf.es.min.js'),
	]);
	const first = sizes[0];
	const orientation = (width: number, height: number): 'portrait' | 'landscape' => width > height ? 'landscape' : 'portrait';
	const pdf = new jsPDF({
		orientation: orientation(first.widthPt, first.heightPt),
		unit: 'pt',
		format: [first.widthPt, first.heightPt],
		compress: true,
	});

	for (let index = 0; index < pages.length; index += 1) {
		const page = pages[index];
		const size = sizes[index];
		const trimWidth = toPoints(page.width, page.unit);
		const trimHeight = toPoints(page.height, page.unit);
		const trimX = markMargin + bleed;
		const trimY = markMargin + bleed;
		if (index > 0) pdf.addPage([size.widthPt, size.heightPt], orientation(size.widthPt, size.heightPt));

		const extendBackground = options.extendBackgroundColourIntoBleed
			?? isSolidColour(page.background);
		if (extendBackground && isSolidColour(page.background) && bleed > 0) {
			pdf.setFillColor(page.background);
			pdf.rect(markMargin, markMargin, trimWidth + 2 * bleed, trimHeight + 2 * bleed, 'F');
		}

		const svgElement = parsePageSvg(page.svg);
		const svgOptions: Svg2pdfOptions = { x: trimX, y: trimY, width: trimWidth, height: trimHeight };
		await pdf.svg(svgElement, svgOptions);
		if (cropMarks) drawCropMarks(pdf, trimX, trimY, trimWidth, trimHeight, bleed);
	}

	return { blob: pdf.output('blob'), pageSizes: sizes };
}
