import { describe, expect, it } from 'vitest';
import { estimateCompressedPdfSize } from './pdf-compressor';

describe('estimateCompressedPdfSize', () => {
	it('returns a positive size estimate', () => {
		expect(estimateCompressedPdfSize(10000, 70)).toBeGreaterThan(0);
		expect(estimateCompressedPdfSize(10000, 100)).toBe(10000);
		expect(estimateCompressedPdfSize(10000, 20)).toBeLessThan(10000);
	});
	it('rejects invalid values', () => {
		expect(() => estimateCompressedPdfSize(-1, 70)).toThrow('Invalid PDF file size');
		expect(() => estimateCompressedPdfSize(10000, 101)).toThrow('Compression quality');
	});
});
