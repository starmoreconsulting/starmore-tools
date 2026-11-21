import { describe, expect, it } from 'vitest';
import { compareUnitPrices } from './unit-price-calculator';

describe('compareUnitPrices', () => {
	it('identifies the lower price per unit and calculates the difference', () => {
		expect(compareUnitPrices(4, 500, 7, 1000)).toEqual({
			firstUnitPrice: 0.008,
			secondUnitPrice: 0.007,
			betterValue: 'second',
			differencePerUnit: 0.001,
			savingsPercent: expect.closeTo(12.5),
		});
	});

	it('reports identical unit prices as the same value', () => {
		expect(compareUnitPrices(3, 500, 6, 1000)).toEqual({
			firstUnitPrice: 0.006,
			secondUnitPrice: 0.006,
			betterValue: 'same',
			differencePerUnit: 0,
			savingsPercent: 0,
		});
	});

	it('supports zero-price products without dividing by zero', () => {
		expect(compareUnitPrices(0, 1, 0, 2).betterValue).toBe('same');
		expect(compareUnitPrices(0, 1, 5, 1).savingsPercent).toBe(100);
	});

	it.each([
		[-1, 2, 1, 2, 'Enter valid non-negative prices in the same currency.'],
		[1, 0, 1, 2, 'Enter quantities greater than zero in the same unit.'],
		[1, 2, Number.MAX_VALUE, Number.MIN_VALUE, 'These values are too large to compare safely.'],
	])('rejects invalid values with a clear message', (firstPrice, firstQuantity, secondPrice, secondQuantity, message) => {
		expect(() => compareUnitPrices(firstPrice, firstQuantity, secondPrice, secondQuantity)).toThrow(message);
	});
});
