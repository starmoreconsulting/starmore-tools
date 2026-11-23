// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import ChinaNigeriaShippingCostCalculator from './ChinaNigeriaShippingCostCalculator';
import VolumetricWeightCalculator from './VolumetricWeightCalculator';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
	container = document.createElement('div');
	document.body.append(container);
	root = createRoot(container);
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

describe('shipping calculator forms', () => {
	it('shows unit-aware volumetric results and validation feedback', () => {
		act(() => root.render(<VolumetricWeightCalculator />));
		enterValue('shipping-volumetric-weight-length', '40');
		enterValue('shipping-volumetric-weight-width', '30');
		enterValue('shipping-volumetric-weight-height', '20');
		expect(container.querySelector('.calc-result strong')?.textContent).toBe('4.8 kg');
		expect(container.textContent).toContain('editable divisor');

		enterValue('shipping-volumetric-weight-length', '0');
		expect(container.querySelector('[role="status"]')?.textContent).toContain('greater than zero');
	});

	it('clearly identifies China-to-Nigeria rates and tax as user-entered estimates', () => {
		act(() => root.render(<ChinaNigeriaShippingCostCalculator />));
		expect(container.textContent).toContain('No freight tariff, FX rate, duty, tax or regulatory rate is supplied or authoritative');
		expect(container.textContent).toContain('Your estimated exchange rate');
		expect(container.textContent).toContain('Your estimated freight rate per kg');
	});
});
