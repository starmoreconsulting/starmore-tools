import { PDFDocument } from 'pdf-lib';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { describe, expect, it } from 'vitest';
import {
	createSearchablePdf,
	getSearchablePdfRasterScale,
	SEARCHABLE_PDF_MAX_PAGE_PIXELS,
	SEARCHABLE_PDF_MAX_PAGES,
	type SearchablePdfPageInput,
} from './searchable-pdf';

const pageInput: SearchablePdfPageInput = {
	image: new Uint8Array([
		137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82,
		0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196, 137,
		0, 0, 0, 11, 73, 68, 65, 84, 120, 156, 99, 96, 0, 2, 0, 0, 5, 0, 1,
		169, 99, 42, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130,
	]),
	mimeType: 'image/png',
	width: 200,
	height: 40,
	renderScale: 1,
	words: [{ text: 'Searchable', x0: 0, y0: 0, x1: 150, y1: 20 }],
};

describe('searchable PDF helpers', () => {
	it('bounds rendering scale to the page pixel limit', () => {
		expect(getSearchablePdfRasterScale(612, 792, 2)).toBe(2);
		expect(612 * 792 * getSearchablePdfRasterScale(612, 792, 10) ** 2).toBeLessThanOrEqual(SEARCHABLE_PDF_MAX_PAGE_PIXELS);
		expect(() => getSearchablePdfRasterScale(0, 10)).toThrow('invalid dimensions');
		expect(() => getSearchablePdfRasterScale(10, 10, 0)).toThrow('valid rendering scale');
	});

	it('creates a page-sized image PDF and embeds invisible searchable text', async () => {
		const bytes = await createSearchablePdf([pageInput], 'Scan.pdf');
		const document = await PDFDocument.load(bytes);
		expect(document.getPageCount()).toBe(1);
		expect(document.getTitle()).toBe('Scan.pdf');
		expect(document.getPage(0).getWidth()).toBe(200);
		expect(document.getPage(0).getHeight()).toBe(40);
		const pageContent = document.getPage(0).node.Contents();
		expect(pageContent).toBeDefined();
		const parsedPdf = await pdfjs.getDocument({ data: bytes.slice() }).promise;
		const text = await parsedPdf.getPage(1).then((page) => page.getTextContent());
		expect(text.items.map((item) => 'str' in item ? item.str : '').join('')).toContain('Searchable');
	});

	it('rejects empty or oversized documents and invalid page data', async () => {
		await expect(createSearchablePdf([], 'empty')).rejects.toThrow('no pages');
		await expect(createSearchablePdf(Array.from({ length: SEARCHABLE_PDF_MAX_PAGES + 1 }, () => pageInput), 'large'))
			.rejects.toThrow('no more than');
		await expect(createSearchablePdf([{ ...pageInput, image: new Uint8Array() }], 'empty image'))
			.rejects.toThrow('no rendered image data');
	});
});
