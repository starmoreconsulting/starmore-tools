// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import UnitPriceCalculator from './UnitPriceCalculator';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
	container = document.createElement('div');
	document.body.append(container);
	root = createRoot(container);
	act(() => root.render(<UnitPriceCalculator />));
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

describe('UnitPriceCalculator', () => {
	it('compares unit prices and names the better value', () => {
		enterValue('unit-price-first-price', '4');
		enterValue('unit-price-first-quantity', '500');
		enterValue('unit-price-second-price', '7');
		enterValue('unit-price-second-quantity', '1000');
		expect([...container.querySelectorAll('.calc-result strong')].map((node) => node.textContent)).toEqual([
			'0.008', '0.007', '0.001', '12.5%',
		]);
		expect(container.querySelector('.tool-message')?.textContent).toBe('Product 2 has the lower price per unit.');
	});

	it('does not compare zero quantities', () => {
		enterValue('unit-price-first-price', '4');
		enterValue('unit-price-first-quantity', '0');
		enterValue('unit-price-second-price', '7');
		enterValue('unit-price-second-quantity', '1000');
		expect(container.querySelector('.tool-message')?.textContent).toBe('Enter quantities greater than zero in the same unit.');
	});
});
