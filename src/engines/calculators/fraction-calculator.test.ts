import { describe, expect, it } from 'vitest';
import { calculateFraction } from './fraction-calculator';

describe('calculateFraction', () => {
	it.each([
		['1', '2', '1', '3', 'add', '5/6', '0.83333333'],
		['3', '4', '1', '4', 'subtract', '1/2', '0.5'],
		['2', '3', '9', '4', 'multiply', '3/2', '1.5'],
		['2', '3', '4', '5', 'divide', '5/6', '0.83333333'],
		['-2', '4', '1', '2', 'add', '0', '0'],
		['1', '-2', '1', '3', 'add', '-1/6', '-0.16666667'],
	] as const)('calculates %s/%s %s %s/%s', (n1, d1, n2, d2, operation, fraction, decimal) => {
		const result = calculateFraction(n1, d1, n2, d2, operation);
		expect(result.fraction).toBe(fraction);
		expect(result.decimal).toBe(decimal);
	});

	it('reduces input and output fractions exactly', () => {
		expect(calculateFraction('2', '4', '1', '4', 'add').fraction).toBe('3/4');
		expect(calculateFraction('12', '3', '2', '1', 'add').fraction).toBe('6');
	});

	it.each([
		['1', '0', '1', '2', 'add', 'A denominator cannot be zero.'],
		['1', '2', '0', '5', 'divide', 'You cannot divide by a fraction equal to zero.'],
		['1.5', '2', '1', '3', 'add', 'Enter whole numbers for each numerator and denominator.'],
		['1'.repeat(101), '2', '1', '3', 'add', 'Keep each number to 100 digits or fewer.'],
	])('rejects invalid fraction input', (n1, d1, n2, d2, operation, message) => {
		expect(() => calculateFraction(n1, d1, n2, d2, operation)).toThrow(message);
	});
});
