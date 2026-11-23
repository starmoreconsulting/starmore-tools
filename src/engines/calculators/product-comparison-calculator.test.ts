import { describe, expect, it } from 'vitest';
import { compareProductAttributes, compareProducts } from './product-comparison-calculator';

const firstProduct = { price: 4, quantity: 500, unit: 'g' };
const secondProduct = { price: 7, quantity: 1000, unit: 'G' };

describe('compareProducts', () => {
	it('calculates price per unit for products using the same unit', () => {
		const comparison = compareProducts(firstProduct, secondProduct, []);

		expect(comparison.unit).toBe('g');
		expect(comparison.unitPrice.firstUnitPrice).toBe(0.008);
		expect(comparison.unitPrice.secondUnitPrice).toBe(0.007);
		expect(comparison.unitPrice.betterValue).toBe('second');
	});

	it('compares only the attributes the user provided', () => {
		expect(compareProducts(firstProduct, secondProduct, [
			{ name: 'Material', firstValue: 'Cotton', secondValue: ' cotton ' },
			{ name: 'Color', firstValue: 'Blue', secondValue: 'Red' },
			{ name: 'Warranty', firstValue: '1 year', secondValue: '' },
			{ name: '', firstValue: '', secondValue: '' },
		]).attributes).toEqual([
			{ name: 'Material', firstValue: 'Cotton', secondValue: 'cotton', result: 'same' },
			{ name: 'Color', firstValue: 'Blue', secondValue: 'Red', result: 'different' },
			{ name: 'Warranty', firstValue: '1 year', secondValue: '', result: 'incomplete' },
		]);
	});

	it('requires the same non-empty unit', () => {
		expect(() => compareProducts(
			{ ...firstProduct, unit: '' },
			secondProduct,
			[],
		)).toThrow('Enter a unit for both products.');
		expect(() => compareProducts(
			firstProduct,
			{ ...secondProduct, unit: 'kg' },
			[],
		)).toThrow('Use the same unit for both products so quantities are comparable.');
	});

	it('requires a criterion name when a value has been entered', () => {
		expect(() => compareProductAttributes([
			{ name: '', firstValue: 'Blue', secondValue: '' },
		])).toThrow('Enter a criterion name for each attribute you compare.');
	});

	it('rejects invalid prices and quantities through the unit-price engine', () => {
		expect(() => compareProducts({ ...firstProduct, price: -1 }, secondProduct, []))
			.toThrow('Enter valid non-negative prices in the same currency.');
		expect(() => compareProducts(firstProduct, { ...secondProduct, quantity: 0 }, []))
			.toThrow('Enter quantities greater than zero in the same unit.');
	});
});
