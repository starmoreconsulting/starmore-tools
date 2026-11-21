// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import FractionCalculator from './FractionCalculator';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
	container = document.createElement('div');
	document.body.append(container);
	root = createRoot(container);
	act(() => root.render(<FractionCalculator />));
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

describe('FractionCalculator', () => {
	it('shows an exact reduced answer and decimal', () => {
		enterValue('fraction-first-numerator', '1');
		enterValue('fraction-first-denominator', '2');
		enterValue('fraction-second-numerator', '1');
		enterValue('fraction-second-denominator', '3');
		expect([...container.querySelectorAll('.calc-result strong')].map((node) => node.textContent)).toEqual([
			'5/6', '0.83333333',
		]);
	});

	it('reports a zero denominator clearly', () => {
		enterValue('fraction-first-numerator', '1');
		enterValue('fraction-first-denominator', '0');
		enterValue('fraction-second-numerator', '1');
		enterValue('fraction-second-denominator', '3');
		expect(container.querySelector('.tool-message')?.textContent).toBe('A denominator cannot be zero.');
	});
});
