import { describe, expect, it } from 'vitest';
import { summarizeNumbers } from './statistics-calculator';

describe('summarizeNumbers', () => {
	it('summarizes a comma-separated list', () => {
		expect(summarizeNumbers('1, 2, 2, 5')).toEqual({
			count: 4,
			mean: 2.5,
			median: 2,
			modes: [2],
			range: 4,
		});
	});

	it('supports whitespace, negative values, and scientific notation', () => {
		expect(summarizeNumbers('-2 1e1 4')).toEqual({
			count: 3,
			mean: 4,
			median: 4,
			modes: null,
			range: 12,
		});
	});

	it('returns all tied modes and handles a single value', () => {
		expect(summarizeNumbers('1 1 2 2 3').modes).toEqual([1, 2]);
		expect(summarizeNumbers('7')).toEqual({
			count: 1,
			mean: 7,
			median: 7,
			modes: null,
			range: 0,
		});
	});

	it.each([
		['', 'Enter at least one number.'],
		['1, nope, 3', 'Use only finite numbers separated by commas or spaces.'],
		['1e309', 'Use only finite numbers separated by commas or spaces.'],
		['1e308 -1e308', 'These values are too large to summarize safely.'],
		[Array.from({ length: 10_001 }, () => '1').join(' '), 'Enter no more than 10,000 numbers.'],
	])('rejects invalid input with a clear message', (source, message) => {
		expect(() => summarizeNumbers(source)).toThrow(message);
	});
});
