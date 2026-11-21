// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import ElectricityConsumptionCalculator from './ElectricityConsumptionCalculator';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
	container = document.createElement('div');
	document.body.append(container);
	root = createRoot(container);
	act(() => root.render(<ElectricityConsumptionCalculator />));
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

describe('ElectricityConsumptionCalculator', () => {
	it('shows daily, monthly and annual kWh', () => {
		enterValue('electricity-wattage', '100');
		enterValue('electricity-hours', '5');
		enterValue('electricity-days', '30');
		const results = container.querySelectorAll('.calc-result strong');
		expect(results[0]?.textContent).toBe('0.5 kWh');
		expect(results[1]?.textContent).toBe('15 kWh');
		expect(results[2]?.textContent).toBe('182.5 kWh');
	});

	it('shows estimated monthly and annual cost', () => {
		enterValue('electricity-wattage', '1000');
		enterValue('electricity-hours', '4');
		enterValue('electricity-days', '30');
		enterValue('electricity-tariff', '0.25');
		const text = container.textContent || '';
		expect(text).toContain('MONTHLY ESTIMATED COST');
		expect(text).toContain('30');
		expect(text).toContain('365');
	});

	it('rejects hours above 24', () => {
		enterValue('electricity-wattage', '100');
		enterValue('electricity-hours', '25');
		enterValue('electricity-days', '30');
		expect(container.querySelector('[role="status"]')?.textContent).toContain('24');
	});
});
