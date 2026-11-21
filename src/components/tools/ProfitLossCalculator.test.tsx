// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import ProfitLossCalculator from './ProfitLossCalculator';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
	container = document.createElement('div');
	document.body.append(container);
	root = createRoot(container);
	act(() => root.render(<ProfitLossCalculator />));
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

describe('ProfitLossCalculator', () => {
	it('shows profit, margin and expense ratio', () => {
		enterValue('profit-loss-revenue', '100');
		enterValue('profit-loss-expenses', '60');
		const results = container.querySelectorAll('.calc-result strong');
		expect(results[0]?.textContent).toBe('40.00');
		expect(results[1]?.textContent).toBe('40%');
		expect(results[2]?.textContent).toBe('60%');
	});

	it('labels a negative result as a loss', () => {
		enterValue('profit-loss-revenue', '50');
		enterValue('profit-loss-expenses', '80');
		expect(container.querySelector('.featured .calc-label')?.textContent).toBe('NET LOSS');
		expect(container.querySelector('.featured strong')?.textContent).toBe('30.00');
	});

	it('rejects negative inputs', () => {
		enterValue('profit-loss-revenue', '-10');
		enterValue('profit-loss-expenses', '20');
		expect(container.querySelector('[role="status"]')?.textContent).toContain('non-negative');
	});
});
