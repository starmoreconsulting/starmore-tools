import { describe, expect, it } from 'vitest';
import { parseReorderedPages } from './pdf-rearrange';

describe('parseReorderedPages', () => {
	it('parses and deduplicates a page order', () => {
		expect(parseReorderedPages('3, 1, 2, 1', 5)).toEqual([2, 0, 1]);
	});
	it('rejects invalid or out-of-range orders', () => {
		expect(() => parseReorderedPages('', 5)).toThrow('Enter the new page order');
		expect(() => parseReorderedPages('1, 6', 5)).toThrow('outside the document');
		expect(() => parseReorderedPages('1-3', 5)).toThrow('Use page numbers');
	});
});
