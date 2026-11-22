import type { PDFDocumentProxy, PDFPageProxy, TextItem } from 'pdfjs-dist';
import { parsePageRanges } from './pdf';

export const PDF_TEXT_EXTRACTOR_MAX_FILE_BYTES = 50_000_000;
export const PDF_TEXT_EXTRACTOR_MAX_PAGES = 500;
export const PDF_TEXT_EXTRACTOR_MAX_OUTPUT_CHARACTERS = 5_000_000;

export interface ExtractedPdfPage {
	pageNumber: number;
	text: string;
}

function isTextItem(item: unknown): item is TextItem {
	return typeof item === 'object' && item !== null && 'str' in item && typeof item.str === 'string';
}

export function normalizePdfPageTextItems(items: unknown[]): string {
	const positioned = items
		.filter(isTextItem)
		.filter((item) => item.str.length > 0)
		.map((item) => ({
			text: item.str,
			x: Number(item.transform[4]) || 0,
			y: Number(item.transform[5]) || 0,
			width: Number(item.width) || 0,
			fontSize: Math.abs(Number(item.transform[3])) || Number(item.height) || 10,
			hasEOL: Boolean(item.hasEOL),
		}))
		.sort((first, second) => second.y - first.y);

	if (positioned.length === 0) return '';

	const lines: typeof positioned[] = [];
	for (const item of positioned) {
		const matchingLine = lines.find((line) => Math.abs(line[0].y - item.y) <= 2.5);
		if (matchingLine) matchingLine.push(item);
		else lines.push([item]);
	}

	lines.sort((first, second) => second[0].y - first[0].y);
	return lines.map((line) => {
		line.sort((first, second) => first.x - second.x);
		let text = '';
		let previous: (typeof line)[number] | undefined;
		for (const item of line) {
			if (previous && item.x - (previous.x + previous.width) > Math.max(1.5, item.fontSize * 0.18)
				&& !/\s$/.test(text) && !/^\s/.test(item.text)) {
				text += ' ';
			}
			text += item.text;
			previous = item;
		}
		return text.trim();
	}).filter(Boolean).join('\n');
}

export function parsePdfTextPageSelection(value: string, pageCount: number): number[] {
	const indices = parsePageRanges(value, pageCount);
	if (indices.length > PDF_TEXT_EXTRACTOR_MAX_PAGES) {
		throw new Error(`Select no more than ${PDF_TEXT_EXTRACTOR_MAX_PAGES} pages at a time.`);
	}
	return indices;
}

export async function extractPdfTextPages(
	document: PDFDocumentProxy,
	pageIndices: number[],
	onPage?: (pageNumber: number, total: number) => void,
): Promise<ExtractedPdfPage[]> {
	if (document.numPages > PDF_TEXT_EXTRACTOR_MAX_PAGES) {
		throw new Error(`This tool supports PDFs with up to ${PDF_TEXT_EXTRACTOR_MAX_PAGES} pages.`);
	}
	if (pageIndices.length === 0) throw new Error('Select at least one page to extract.');
	if (pageIndices.length > PDF_TEXT_EXTRACTOR_MAX_PAGES) {
		throw new Error(`Select no more than ${PDF_TEXT_EXTRACTOR_MAX_PAGES} pages at a time.`);
	}
	const uniqueIndices = [...new Set(pageIndices)];
	if (uniqueIndices.some((index) => !Number.isSafeInteger(index) || index < 0 || index >= document.numPages)) {
		throw new Error('One or more selected pages are outside this PDF.');
	}

	const result: ExtractedPdfPage[] = [];
	let totalCharacters = 0;
	for (const [index, pageIndex] of uniqueIndices.entries()) {
		const pageNumber = pageIndex + 1;
		onPage?.(pageNumber, uniqueIndices.length);
		let page: PDFPageProxy | undefined;
		try {
			page = await document.getPage(pageNumber);
			const content = await page.getTextContent();
			const text = normalizePdfPageTextItems(content.items);
			totalCharacters += text.length;
			if (totalCharacters > PDF_TEXT_EXTRACTOR_MAX_OUTPUT_CHARACTERS) {
				throw new Error('Extracted text exceeds the 5 MB text limit. Select fewer pages.');
			}
			result.push({ pageNumber, text });
		} catch (error) {
			if (error instanceof Error && error.message.includes('5 MB text limit')) throw error;
			throw new Error(`Could not extract text from page ${pageNumber}. The PDF may be damaged or its text may be unsupported.`);
		} finally {
			page?.cleanup();
		}
	}
	return result;
}

export function formatExtractedPdfText(pages: ExtractedPdfPage[]): string {
	return pages.map(({ pageNumber, text }) => (
		`--- Page ${pageNumber} ---\n${text || '[No selectable text detected on this page]'}`
	)).join('\n\n');
}
