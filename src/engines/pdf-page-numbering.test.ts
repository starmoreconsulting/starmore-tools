import { describe, expect, it } from 'vitest';
import { formatPageNumber, normalizePageNumberOptions } from './pdf-page-numbering';

describe('PDF page numbering helpers', () => {
	it('formats page numbers', () => {
		expect(formatPageNumber('number', 3, 10)).toBe('3');
		expect(formatPageNumber('page-number', 3, 10)).toBe('Page 3');
		expect(formatPageNumber('page-of-total', 3, 10)).toBe('3 / 10');
	});

	it('validates numbering options', () => {
		expect(normalizePageNumberOptions(5, 10)).toEqual({ startNumber: 5, size: 10 });
		expect(() => normalizePageNumberOptions(0, 10)).toThrow('Start number');
		expect(() => normalizePageNumberOptions(1, 73)).toThrow('Font size');
	});
});
