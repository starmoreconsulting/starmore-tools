// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import CurrencyConverter from './CurrencyConverter';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
	container = document.createElement('div');
	document.body.append(container);
	root = createRoot(container);
	act(() => root.render(<CurrencyConverter />));
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

describe('CurrencyConverter', () => {
	it('converts USD to NGN using bundled rates', () => {
		enterValue('currency-amount', '1');
		const results = container.querySelectorAll('.calc-result strong');
		expect(results[0]?.textContent).toBe('1,580.00 NGN');
		expect(container.querySelector('[role="status"]')?.textContent).toContain('bundled rates dated');
	});

	it('rejects negative amounts', () => {
		enterValue('currency-amount', '-10');
		expect(container.querySelector('[role="status"]')?.textContent).toContain('non-negative');
	});
});
