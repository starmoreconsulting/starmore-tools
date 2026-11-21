import { describe, expect, it } from 'vitest';
import { calculateInvoice } from './invoice';

describe('calculateInvoice', () => {
	it('calculates subtotal, tax and total', () => {
		expect(calculateInvoice([{ description: 'Design', quantity: 2, rate: 100 }], 10)).toEqual({ subtotal: 200, tax: 20, total: 220 });
	});

	it('supports empty items', () => {
		expect(calculateInvoice([], 20)).toEqual({ subtotal: 0, tax: 0, total: 0 });
	});

	it('rejects invalid quantities and rates', () => {
		expect(() => calculateInvoice([{ description: 'Design', quantity: -1, rate: 100 }], 10)).toThrow('valid item quantities');
		expect(() => calculateInvoice([{ description: 'Design', quantity: 1, rate: -100 }], 10)).toThrow('valid item quantities');
		expect(() => calculateInvoice([], -1)).toThrow('Tax rate must be non-negative.');
	});
});
