// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import BreakEvenCalculator from './BreakEvenCalculator';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
	container = document.createElement('div');
	document.body.append(container);
	root = createRoot(container);
	act(() => root.render(<BreakEvenCalculator />));
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

describe('BreakEvenCalculator', () => {
	it('calculates units, revenue and contribution', () => {
		enterValue('break-even-fixed', '1000');
		enterValue('break-even-price', '50');
		enterValue('break-even-variable', '30');
		const results = container.querySelectorAll('.calc-result strong');
		expect(results[0]?.textContent).toBe('50');
		expect(results[1]?.textContent).toBe('2,500.00');
		expect(results[2]?.textContent).toBe('20.00');
	});

	it('shows an error when contribution is zero', () => {
		enterValue('break-even-fixed', '1000');
		enterValue('break-even-price', '30');
		enterValue('break-even-variable', '30');
		expect(container.querySelector('[role="status"]')?.textContent).toContain('greater than variable cost');
	});
});
