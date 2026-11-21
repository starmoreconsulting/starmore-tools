// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import BasicCalculator from './BasicCalculator';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
	container = document.createElement('div');
	document.body.append(container);
	root = createRoot(container);
	act(() => root.render(<BasicCalculator />));
});

afterEach(() => {
	act(() => root.unmount());
	container.remove();
});

describe('BasicCalculator', () => {
	it('shows live results with normal arithmetic precedence', () => {
		const input = container.querySelector<HTMLInputElement>('[aria-label="Calculator expression"]')!;
		act(() => {
			const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
			setter?.call(input, '2 + 3 × 4');
			input.dispatchEvent(new Event('input', { bubbles: true }));
		});
		expect(container.querySelector('.percentage-result strong')?.textContent).toBe('14');
	});

	it('accepts keypad entry and clears the expression', () => {
		for (const key of ['2', '+', '3']) {
			const button = [...container.querySelectorAll('button')].find((item) => item.textContent?.trim() === key);
			act(() => button?.click());
		}
		expect(container.querySelector('.percentage-result strong')?.textContent).toBe('5');
		act(() => container.querySelector<HTMLButtonElement>('[aria-label="Clear expression"]')?.click());
		expect(container.querySelector<HTMLInputElement>('[aria-label="Calculator expression"]')?.value).toBe('');
		expect(container.querySelector('.percentage-result strong')?.textContent).toBe('—');
	});

	it('shows a clear error for division by zero', () => {
		const input = container.querySelector<HTMLInputElement>('[aria-label="Calculator expression"]')!;
		act(() => {
			const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
			setter?.call(input, '4 / 0');
			input.dispatchEvent(new Event('input', { bubbles: true }));
		});
		expect(container.querySelector('.percentage-error')?.textContent).toBe('Division by zero is not allowed.');
	});
});
