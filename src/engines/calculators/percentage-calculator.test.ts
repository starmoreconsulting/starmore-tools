import { describe, expect, it } from 'vitest';
import { calculatePercentage } from './percentage-calculator';

describe('calculatePercentage', () => {
	it.each([
		['percent-of', 15, 200, 30],
		['what-percent', 30, 200, 15],
		['change', 80, 100, 25],
		['change', 100, 80, -20],
		['change', -100, 50, 150],
	])('calculates %s for %s and %s', (mode, first, second, expected) => {
		expect(calculatePercentage(mode, first, second)).toBe(expected);
	});

	it.each([
		['what-percent', 10, 0],
		['change', 0, 10],
	])('rejects a zero denominator in %s mode', (mode, first, second) => {
		expect(() => calculatePercentage(mode, first, second)).toThrow('This calculation needs a non-zero divisor.');
	});

	it.each([
		['percent-of', 1e308, 1e308],
		['what-percent', 1e308, 1e-308],
		['change', -1e308, 1e308],
	])('rejects non-finite results in %s mode', (mode, first, second) => {
		expect(() => calculatePercentage(mode, first, second)).toThrow('These values are too large to calculate safely.');
	});
});
