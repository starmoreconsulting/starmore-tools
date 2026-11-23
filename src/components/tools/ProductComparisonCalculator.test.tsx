// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import ProductComparisonCalculator from './ProductComparisonCalculator';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
	container = document.createElement('div');
	document.body.append(container);
	root = createRoot(container);
	act(() => root.render(<ProductComparisonCalculator />));
});

afterEach(() => {
	act(() => root.unmount());
	container.remove();
});

function enterValue(id: string, value: string) {
	const input = container.querySelector<HTMLInputElement>(`#${id}`)!;
	act(() => {
		const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
		setter?.call(input, value);
		input.dispatchEvent(new Event('input', { bubbles: true }));
	});
}

describe('ProductComparisonCalculator', () => {
	it('shows clearly labeled unit prices and the lower-price choice', () => {
		enterValue('product-comparison-first-price', '4');
		enterValue('product-comparison-first-quantity', '500');
		enterValue('product-comparison-first-unit', 'g');
		enterValue('product-comparison-second-price', '7');
		enterValue('product-comparison-second-quantity', '1000');
		enterValue('product-comparison-second-unit', 'g');

		expect([...container.querySelectorAll('.calc-result strong')].map((node) => node.textContent)).toEqual([
			'0.008 / g', '0.007 / g', '0.001', '12.5%',
		]);
		expect(container.querySelector('.tool-message')?.textContent).toBe('Product 2 has the lower price per unit.');
	});

	it('requires comparable units and does not infer a comparison when values are absent', () => {
		enterValue('product-comparison-first-price', '4');
		enterValue('product-comparison-first-quantity', '500');
		enterValue('product-comparison-first-unit', 'g');
		enterValue('product-comparison-second-price', '7');
		enterValue('product-comparison-second-quantity', '1000');
		enterValue('product-comparison-second-unit', 'kg');
		expect(container.querySelector('.tool-message')?.textContent)
			.toBe('Use the same unit for both products so quantities are comparable.');

		act(() => container.querySelector<HTMLButtonElement>('button[aria-label^="Remove"]')?.click());
		act(() => container.querySelector<HTMLButtonElement>('button:not([aria-label])')?.click());
		enterValue('product-comparison-criterion-0', 'Material');
		enterValue('product-comparison-first-attribute-0', 'Cotton');
		expect(container.querySelector('#product-comparison-criterion-0')?.parentElement?.parentElement?.textContent)
			.toContain('Not enough information');
	});
});
