import { describe, expect, it, vi } from 'vitest';
import {
	extractPdfTextPages,
	formatExtractedPdfText,
	normalizePdfPageTextItems,
	parsePdfTextPageSelection,
	PDF_TEXT_EXTRACTOR_MAX_OUTPUT_CHARACTERS,
} from './pdf-text-extractor';
import type { PDFDocumentProxy } from 'pdfjs-dist';

function textItem(str: string, x: number, y: number, width: number, hasEOL = false) {
	return { str, dir: 'ltr', transform: [1, 0, 0, 10, x, y], width, height: 10, fontName: 'font', hasEOL };
}

describe('PDF text extractor', () => {
	it('groups positioned text into lines while preserving word spacing and reading order', () => {
		expect(normalizePdfPageTextItems([
			textItem('world', 40, 100, 25),
			textItem('Hello', 10, 100, 25),
			textItem('Second line', 10, 80, 60),
		])).toBe('Hello world\nSecond line');
	});

	it('parses selected pages and validates page selection', () => {
		expect(parsePdfTextPageSelection('1, 3-4', 5)).toEqual([0, 2, 3]);
		expect(() => parsePdfTextPageSelection('', 5)).toThrow('Enter page numbers or ranges');
		expect(() => parsePdfTextPageSelection('1-6', 5)).toThrow('outside the document');
	});

	it('extracts selected pages, reports progress, and marks pages without selectable text', async () => {
		const cleanup1 = vi.fn();
		const cleanup2 = vi.fn();
		const document = {
			numPages: 2,
			getPage: vi.fn(async (pageNumber: number) => ({
				getTextContent: async () => ({ items: pageNumber === 1 ? [textItem('Page one', 0, 10, 40)] : [] }),
				cleanup: pageNumber === 1 ? cleanup1 : cleanup2,
			})),
		} as unknown as PDFDocumentProxy;
		const progress = vi.fn();
		const pages = await extractPdfTextPages(document, [0, 1], progress);
		expect(pages).toEqual([{ pageNumber: 1, text: 'Page one' }, { pageNumber: 2, text: '' }]);
		expect(progress).toHaveBeenNthCalledWith(1, 1, 2);
		expect(progress).toHaveBeenNthCalledWith(2, 2, 2);
		expect(cleanup1).toHaveBeenCalledOnce();
		expect(cleanup2).toHaveBeenCalledOnce();
		expect(formatExtractedPdfText(pages)).toContain('[No selectable text detected on this page]');
	});

	it('rejects invalid page indices and output exceeding the text limit', async () => {
		const document = {
			numPages: 1,
			getPage: vi.fn(async () => ({
				getTextContent: async () => ({ items: [textItem('x'.repeat(PDF_TEXT_EXTRACTOR_MAX_OUTPUT_CHARACTERS + 1), 0, 1, 1)] }),
				cleanup: vi.fn(),
			})),
		} as unknown as PDFDocumentProxy;
		await expect(extractPdfTextPages(document, [-1])).rejects.toThrow('outside this PDF');
		await expect(extractPdfTextPages(document, [0])).rejects.toThrow('5 MB text limit');
	});
});
