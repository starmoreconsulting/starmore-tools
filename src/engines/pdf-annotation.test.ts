import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import {
	applyPdfAnnotations,
	validatePdfAnnotations,
	type PdfAnnotation,
} from './pdf-annotation';

async function makePdf(pageCount = 2): Promise<Uint8Array> {
	const document = await PDFDocument.create();
	for (let page = 0; page < pageCount; page += 1) document.addPage([612, 792]);
	return document.save();
}

describe('PDF annotations', () => {
	it('validates notes, highlights, page ranges, and limits', () => {
		const valid: PdfAnnotation[] = [
			{ type: 'note', pageIndex: 0, x: 0.3, y: 0.2, text: 'Review this section' },
			{ type: 'highlight', pageIndex: 1, x: 0.1, y: 0.2, width: 0.4, height: 0.05 },
		];
		expect(() => validatePdfAnnotations(valid, 2)).not.toThrow();
		expect(() => validatePdfAnnotations([], 2)).toThrow('Add at least one');
		expect(() => validatePdfAnnotations([valid[0]], 101)).toThrow('up to 100 pages');
		expect(() => validatePdfAnnotations([{ ...valid[0], pageIndex: 2 }], 2)).toThrow('not in this PDF');
		expect(() => validatePdfAnnotations([{ ...valid[0], x: Number.NaN }], 2)).toThrow('invalid position');
		expect(() => validatePdfAnnotations([{ type: 'highlight', pageIndex: 0, x: 0.8, y: 0.8, width: 0.3, height: 0.1 }], 2)).toThrow('invalid size');
		expect(() => validatePdfAnnotations([{ ...valid[0], text: '  ' }], 2)).toThrow('is empty');
	});

	it('adds a note and highlight to selected pages and preserves the page count', async () => {
		const source = await makePdf();
		const output = await applyPdfAnnotations(source, [
			{ type: 'note', pageIndex: 0, x: 0.2, y: 0.2, text: 'Check the totals' },
			{ type: 'highlight', pageIndex: 1, x: 0.1, y: 0.3, width: 0.6, height: 0.05 },
		]);
		const result = await PDFDocument.load(output);
		expect(result.getPageCount()).toBe(2);
		expect(output.length).toBeGreaterThan(source.length);
	});

	it('rejects unreadable PDFs and unsupported standard-font characters', async () => {
		await expect(applyPdfAnnotations(new Uint8Array([0, 1, 2]), [
			{ type: 'note', pageIndex: 0, x: 0.1, y: 0.1, text: 'note' },
		])).rejects.toThrow('Could not read the PDF');
		await expect(applyPdfAnnotations(await makePdf(), [
			{ type: 'note', pageIndex: 0, x: 0.1, y: 0.1, text: 'Unsupported: 😀' },
		])).rejects.toThrow('Use basic Latin characters');
	});
});
