import { PDFDocument, StandardFonts } from 'pdf-lib';

export const SEARCHABLE_PDF_MAX_FILE_BYTES = 50_000_000;
export const SEARCHABLE_PDF_MAX_PAGES = 10;
export const SEARCHABLE_PDF_MAX_PAGE_PIXELS = 6_000_000;
export const SEARCHABLE_PDF_MAX_TOTAL_PIXELS = 20_000_000;
const MAX_PDF_PAGE_DIMENSION = 20_000;
const MAX_RENDERED_PAGE_SIDE = 16_384;

export interface OcrWord {
	text: string;
	x0: number;
	y0: number;
	x1: number;
	y1: number;
}

export interface SearchablePdfPageInput {
	image: Uint8Array;
	mimeType: 'image/png' | 'image/jpeg';
	width: number;
	height: number;
	renderScale: number;
	words: OcrWord[];
}

export function getSearchablePdfRasterScale(
	width: number,
	height: number,
	requestedScale = 1.5,
): number {
	if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0
		|| width > MAX_PDF_PAGE_DIMENSION || height > MAX_PDF_PAGE_DIMENSION || !Number.isFinite(width * height)) {
		throw new Error('The PDF page has invalid dimensions.');
	}
	if (!Number.isFinite(requestedScale) || requestedScale <= 0) {
		throw new Error('Choose a valid rendering scale.');
	}
	const pixelLimitScale = Math.sqrt(SEARCHABLE_PDF_MAX_PAGE_PIXELS / (width * height));
	const sideLimitScale = (MAX_RENDERED_PAGE_SIDE - 1) / Math.max(width, height);
	const scale = Math.min(requestedScale, pixelLimitScale * 0.999, sideLimitScale);
	return scale;
}

function safeOcrText(value: string): string {
	return value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
}

export async function createSearchablePdf(pages: SearchablePdfPageInput[], title: string): Promise<Uint8Array> {
	if (pages.length === 0) throw new Error('The PDF contains no pages to process.');
	if (pages.length > SEARCHABLE_PDF_MAX_PAGES) {
		throw new Error(`Choose a PDF with no more than ${SEARCHABLE_PDF_MAX_PAGES} pages.`);
	}

	let totalPixels = 0;
	for (const [index, page] of pages.entries()) {
		if (!Number.isSafeInteger(page.width) || !Number.isSafeInteger(page.height)
			|| page.width < 1 || page.height < 1 || page.width * page.height > SEARCHABLE_PDF_MAX_PAGE_PIXELS) {
			throw new Error(`Page ${index + 1} exceeds the supported image dimensions.`);
		}
		if (!Number.isFinite(page.renderScale) || page.renderScale <= 0) {
			throw new Error(`Page ${index + 1} has an invalid render scale.`);
		}
		if (page.image.byteLength === 0) throw new Error(`Page ${index + 1} has no rendered image data.`);
		totalPixels += page.width * page.height;
	}
	if (totalPixels > SEARCHABLE_PDF_MAX_TOTAL_PIXELS) {
		throw new Error('The rendered document exceeds the image-processing limit. Choose fewer pages.');
	}

	const document = await PDFDocument.create();
	document.setTitle(safeOcrText(title).slice(0, 200) || 'Searchable PDF');
	const font = await document.embedFont(StandardFonts.Helvetica);

	for (const input of pages) {
		const pageWidth = input.width / input.renderScale;
		const pageHeight = input.height / input.renderScale;
		const page = document.addPage([pageWidth, pageHeight]);
		const image = input.mimeType === 'image/jpeg'
			? await document.embedJpg(input.image)
			: await document.embedPng(input.image);
		page.drawImage(image, { x: 0, y: 0, width: pageWidth, height: pageHeight });

		for (const word of input.words) {
			const text = safeOcrText(word.text);
			const values = [word.x0, word.y0, word.x1, word.y1];
			if (!text || values.some((value) => !Number.isFinite(value))) continue;
			const left = Math.max(0, Math.min(input.width, word.x0));
			const top = Math.max(0, Math.min(input.height, word.y0));
			const right = Math.max(left, Math.min(input.width, word.x1));
			const bottom = Math.max(top, Math.min(input.height, word.y1));
			const boxHeight = bottom - top;
			if (right <= left || boxHeight < 1) continue;

			let supportedText = text;
			try {
				font.encodeText(supportedText);
			} catch {
				supportedText = [...text].map((character) => {
					try {
						font.encodeText(character);
						return character;
					} catch {
						return '?';
					}
				}).join('');
			}
			page.drawText(supportedText, {
				x: left / input.renderScale,
				y: pageHeight - bottom / input.renderScale,
				size: Math.max(1, boxHeight / input.renderScale),
				font,
				opacity: 0,
			});
		}
	}

	return document.save();
}
