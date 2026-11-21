import { describe, expect, it } from 'vitest';
import { calculateTip } from './tip-calculator';

describe('calculateTip', () => {
	it('calculates the tip, total, and per-person amounts', () => {
		expect(calculateTip(80, 20, 4)).toEqual({
			tipAmount: 16,
			totalAmount: 96,
			tipPerPerson: 4,
			totalPerPerson: 24,
		});
	});

	it('supports zero bill and zero tip values', () => {
		expect(calculateTip(0, 15, 2)).toEqual({
			tipAmount: 0,
			totalAmount: 0,
			tipPerPerson: 0,
			totalPerPerson: 0,
		});
		expect(calculateTip(50, 0, 1).totalAmount).toBe(50);
	});

	it.each([
		[-1, 15, 1, 'Enter a valid non-negative bill amount.'],
		[50, -1, 1, 'Enter a valid non-negative tip percentage.'],
		[50, 15, 0, 'Enter a whole number of people greater than zero.'],
		[50, 15, 1.5, 'Enter a whole number of people greater than zero.'],
		[Number.MAX_VALUE, Number.MAX_VALUE, 1, 'These values are too large to calculate safely.'],
	])('rejects invalid values with a clear message', (bill, tip, people, message) => {
		expect(() => calculateTip(bill, tip, people)).toThrow(message);
	});
});
