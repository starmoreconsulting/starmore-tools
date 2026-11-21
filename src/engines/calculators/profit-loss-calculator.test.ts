import { describe, expect, it } from 'vitest';
import { calculateProfitLoss } from './profit-loss-calculator';

describe('calculateProfitLoss', () => {
	it('calculates profit and rates', () => {
		expect(calculateProfitLoss(100, 60)).toEqual({ profit: 40, margin: 40, expenseRatio: 60 });
		expect(calculateProfitLoss(50, 80)).toEqual({ profit: -30, margin: -60, expenseRatio: 160 });
	});

	it('returns unavailable rates for zero revenue', () => {
		expect(calculateProfitLoss(0, 20)).toEqual({ profit: -20, margin: null, expenseRatio: null });
	});

	it('rejects negative values', () => {
		expect(() => calculateProfitLoss(-1, 20)).toThrow('Revenue and expenses must be non-negative.');
		expect(() => calculateProfitLoss(100, -20)).toThrow('Revenue and expenses must be non-negative.');
	});

	it('rejects overflow', () => {
		expect(() => calculateProfitLoss(Number.MAX_VALUE, -1)).toThrow('Revenue and expenses must be non-negative.');
		expect(() => calculateProfitLoss(Number.MAX_VALUE, Number.MAX_VALUE)).not.toThrow();
	});
});
