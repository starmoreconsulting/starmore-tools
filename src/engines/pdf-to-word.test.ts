import { describe, expect, it } from 'vitest';
import { normalizeExtractedPageText, summarizePdfWordConversion } from './pdf-to-word';

describe('PDF to Word helpers', () => {
	it('normalizes lines and removes blank or whitespace-only lines', () => {
		expect(normalizeExtractedPageText('Heading\r\n\r\n  Body text  \n')).toEqual(['Heading', 'Body text']);
	});

	it('detects likely image-only PDFs', () => {
		expect(summarizePdfWordConversion(3, 0)).toEqual({ pageCount: 3, extractedLines: 0, imageOnlyLikely: true });
		expect(summarizePdfWordConversion(3, 12).imageOnlyLikely).toBe(false);
	});
});
