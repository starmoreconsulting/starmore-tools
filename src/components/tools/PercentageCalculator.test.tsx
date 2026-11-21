// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import PercentageCalculator from './PercentageCalculator';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
	container = document.createElement('div');
	document.body.append(container);
	root = createRoot(container);
	act(() => root.render(<PercentageCalculator />));
});

afterEach(() => {
	act(() => root.unmount());
	container.remove();
});

function enterValue(label: string, value: string) {
	const input = container.querySelector<HTMLInputElement>(`[aria-label="${label}"]`)!;
	act(() => {
		const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
		setter?.call(input, value);
		input.dispatchEvent(new Event('input', { bubbles: true }));
	});
}

describe('PercentageCalculator', () => {
	it('shows a clear error instead of infinity when the result overflows', () => {
		enterValue('Percentage', '1e308');
		enterValue('Number', '1e308');
		expect(container.querySelector('.percentage-result strong')?.textContent).toBe('—');
		expect(container.querySelector('.percentage-error')?.textContent).toBe('These values are too large to calculate safely.');
	});

	it('shows the non-zero divisor error when finding a percentage of zero', () => {
		act(() => {
			[...container.querySelectorAll('[role="tab"]')][1].dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});
		enterValue('Part', '10');
		enterValue('Whole', '0');
		expect(container.querySelector('.percentage-result strong')?.textContent).toBe('—');
		expect(container.querySelector('.percentage-error')?.textContent).toBe('This calculation needs a non-zero divisor.');
	});
});
