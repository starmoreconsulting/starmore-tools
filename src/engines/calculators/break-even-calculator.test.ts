import { describe, expect, it } from 'vitest';
import { calculateBreakEven } from './break-even-calculator';

describe('calculateBreakEven', () => {
	it('calculates break-even units and revenue', () => {
		expect(calculateBreakEven(1000, 50, 30)).toEqual({ units: 50, revenue: 2500, contributionPerUnit: 20 });
	});

	it('supports zero fixed costs', () => {
		expect(calculateBreakEven(0, 25, 10)).toEqual({ units: 0, revenue: 0, contributionPerUnit: 15 });
	});

	it('rejects negative values', () => {
		expect(() => calculateBreakEven(-100, 50, 30)).toThrow('Fixed costs, selling price and variable cost must be non-negative.');
		expect(() => calculateBreakEven(100, -50, 30)).toThrow('Fixed costs, selling price and variable cost must be non-negative.');
	});

	it('rejects a contribution that cannot break even', () => {
		expect(() => calculateBreakEven(1000, 30, 30)).toThrow('Selling price must be greater than variable cost.');
		expect(() => calculateBreakEven(1000, 20, 30)).toThrow('Selling price must be greater than variable cost.');
	});

	it('rejects overflow', () => {
		const variable = 1e308 - 1e292;
		expect(() => calculateBreakEven(Number.MAX_VALUE, 1e308, variable)).toThrow('These values are too large to calculate safely.');
	});
});
