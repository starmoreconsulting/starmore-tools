import { describe, expect, it } from 'vitest';
import { convertCurrency, CURRENCY_RATES } from './currency-converter';

describe('convertCurrency', () => {
	it('converts through the bundled USD rate table', () => {
		expect(convertCurrency(100, 'USD', 'EUR')).toBeCloseTo(92, 8);
		expect(convertCurrency(1580, 'NGN', 'USD')).toBeCloseTo(1, 8);
		expect(convertCurrency(100, 'USD', 'USD')).toBe(100);
	});

	it('rejects negative and non-finite amounts', () => {
		expect(() => convertCurrency(-1, 'USD', 'EUR')).toThrow('Enter a valid non-negative amount.');
		expect(() => convertCurrency(Infinity, 'USD', 'EUR')).toThrow('Enter a valid non-negative amount.');
	});

	it('rejects unsupported currencies', () => {
		expect(() => convertCurrency(10, 'XXX', 'USD')).toThrow('Choose a supported currency.');
		expect(() => convertCurrency(10, 'USD', 'XXX')).toThrow('Choose a supported currency.');
	});

	it('contains the same-currency identity rate', () => {
		expect(CURRENCY_RATES.USD).toBe(1);
	});
});
