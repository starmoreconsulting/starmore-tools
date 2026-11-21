// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import TipCalculator from './TipCalculator';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
	container = document.createElement('div');
	document.body.append(container);
	root = createRoot(container);
	act(() => root.render(<TipCalculator />));
});

afterEach(() => {
	act(() => root.unmount());
	container.remove();
});

function enterValue(label: string, value: string) {
	const input = container.querySelector<HTMLInputElement>(`#${label}`)!;
	act(() => {
		const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
		setter?.call(input, value);
		input.dispatchEvent(new Event('input', { bubbles: true }));
	});
}

describe('TipCalculator', () => {
	it('shows the tip, total, and even split live', () => {
		enterValue('tip-bill', '80');
		enterValue('tip-percent', '20');
		enterValue('tip-people', '4');
		const amounts = [...container.querySelectorAll('.calc-result strong')].map((node) => node.textContent);
		expect(amounts).toEqual(['16.00', '96.00', '4.00', '24.00']);
	});

	it('rejects a fractional group size with a clear message', () => {
		enterValue('tip-bill', '80');
		enterValue('tip-people', '1.5');
		expect(container.querySelector('.tool-message')?.textContent).toBe('Enter a whole number of people greater than zero.');
	});
});
