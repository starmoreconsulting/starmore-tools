// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import FuelConsumptionCalculator from './FuelConsumptionCalculator';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
	container = document.createElement('div');
	document.body.append(container);
	root = createRoot(container);
	act(() => root.render(<FuelConsumptionCalculator />));
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

describe('FuelConsumptionCalculator', () => {
	it('shows litres per 100 km, km per litre and MPG', () => {
		enterValue('fuel-distance', '500');
		enterValue('fuel-used', '40');
		const results = container.querySelectorAll('.calc-result strong');
		expect(results[0]?.textContent).toBe('8');
		expect(results[1]?.textContent).toBe('12.5');
		expect(results[2]?.textContent).toBe('29.4');
	});

	it('shows optional trip cost', () => {
		enterValue('fuel-distance', '500');
		enterValue('fuel-used', '40');
		enterValue('fuel-price', '1.5');
		expect(container.textContent).toContain('ESTIMATED FUEL COST');
		expect(container.textContent).toContain('60');
	});

	it('rejects zero distance', () => {
		enterValue('fuel-distance', '0');
		enterValue('fuel-used', '40');
		expect(container.querySelector('[role="status"]')?.textContent).toContain('greater than zero');
	});
});
