// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import StatisticsCalculator from './StatisticsCalculator';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
	container = document.createElement('div');
	document.body.append(container);
	root = createRoot(container);
	act(() => root.render(<StatisticsCalculator />));
});

afterEach(() => {
	act(() => root.unmount());
	container.remove();
});

function enterNumbers(value: string) {
	const input = container.querySelector<HTMLTextAreaElement>('[aria-label="Numbers to summarize"]')!;
	act(() => {
		const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
		setter?.call(input, value);
		input.dispatchEvent(new Event('input', { bubbles: true }));
	});
}

describe('StatisticsCalculator', () => {
	it('updates the summary as a list is entered', () => {
		enterNumbers('1, 2, 2, 5');
		expect([...container.querySelectorAll('.calc-result strong')].map((node) => node.textContent)).toEqual([
			'4', '2.5', '2', '2', '4',
		]);
	});

	it('shows invalid data instead of a partial summary', () => {
		enterNumbers('1, nope, 3');
		expect([...container.querySelectorAll('.calc-result strong')].map((node) => node.textContent)).toEqual([
			'—', '—', '—', '—', '—',
		]);
		expect(container.querySelector('.tool-message')?.textContent).toBe('Use only finite numbers separated by commas or spaces.');
	});
});
