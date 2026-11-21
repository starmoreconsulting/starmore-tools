import { describe, expect, it } from 'vitest';
import { calculateBasicExpression } from './basic-calculator';

describe('calculateBasicExpression', () => {
	it.each([
		['2 + 3 × 4', 14],
		['(2 + 3) × 4', 20],
		['-8 / 2 + 1', -3],
		['10 % 4', 2],
		['.5 + 1.25', 1.75],
		['1e2 / 4', 25],
		['12 − 5', 7],
	])('calculates %s', (expression, expected) => {
		expect(calculateBasicExpression(expression)).toBe(expected);
	});

	it.each([
		['', 'Enter an expression to calculate.'],
		['2 +', 'Enter a valid number or arithmetic expression.'],
		['(2 + 3', 'Check that every opening parenthesis has a closing one.'],
		['2 / 0', 'Division by zero is not allowed.'],
		['2 % 0', 'Division by zero is not allowed.'],
		['2 + alert(1)', 'Enter a valid number or arithmetic expression.'],
		['9'.repeat(257), 'Keep the expression to 256 characters or fewer.'],
		['1e309', 'The result is outside the calculator’s supported range.'],
	])('rejects invalid input %j with a clear error', (expression, message) => {
		expect(() => calculateBasicExpression(expression)).toThrow(message);
	});
});
