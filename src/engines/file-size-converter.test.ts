import { describe, expect, it } from 'vitest';
import { convertFileSize } from './file-size-converter';

describe('convertFileSize', () => {
	it('converts between decimal units', () => {
		expect(convertFileSize(1.5, 'GB', 'MB')).toEqual({ value: 1500, bytes: 1_500_000_000 });
	});

	it('distinguishes decimal megabytes from binary mebibytes', () => {
		expect(convertFileSize(1, 'MB', 'MiB').value).toBeCloseTo(0.9536743164, 8);
	});

	it('converts from binary to decimal units', () => {
		expect(convertFileSize(1, 'GiB', 'GB').value).toBeCloseTo(1.073741824, 8);
	});

	it('supports conversion to and from bytes', () => {
		expect(convertFileSize(1024, 'B', 'KiB').value).toBe(1);
		expect(convertFileSize(2, 'MiB', 'B').bytes).toBe(2_097_152);
	});

	it('rejects negative and non-finite amounts', () => {
		expect(() => convertFileSize(-1, 'KB', 'MB')).toThrow('finite, non-negative');
		expect(() => convertFileSize(Number.POSITIVE_INFINITY, 'KB', 'MB')).toThrow('finite, non-negative');
	});

	it('reports overflow instead of returning Infinity', () => {
		expect(() => convertFileSize(Number.MAX_VALUE, 'TB', 'B')).toThrow('too large');
	});
});
