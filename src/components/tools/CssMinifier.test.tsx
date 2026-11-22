// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CssMinifier from './CssMinifier';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const writeText = vi.fn();
let container: HTMLDivElement;
let root: Root;

function setValue(value: string) {
	const input = container.querySelector<HTMLTextAreaElement>('#css-minifier-input');
	if (!input) throw new Error('Missing CSS input');
	Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set?.call(input, value);
	input.dispatchEvent(new Event('input', { bubbles: true }));
	input.dispatchEvent(new Event('change', { bubbles: true }));
}

beforeEach(() => {
	writeText.mockReset();
	Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
	container = document.createElement('div');
	document.body.append(container);
	root = createRoot(container);
	act(() => root.render(<CssMinifier />));
});

afterEach(() => {
	act(() => root.unmount());
	container.remove();
});

describe('CssMinifier', () => {
	it('minifies CSS and copies the result', async () => {
		act(() => setValue('.a { color: red; }'));
		act(() => container.querySelector<HTMLButtonElement>('.tool-actions button')?.click());
		expect(container.querySelector('#css-minifier-output')?.textContent).toBe('.a{color: red;}');
		await act(async () => container.querySelectorAll<HTMLButtonElement>('.tool-actions button')[1]?.click());
		expect(writeText).toHaveBeenCalledWith('.a{color: red;}');
	});

	it('reports malformed CSS without showing a result', () => {
		act(() => setValue('.a { color: "unfinished }'));
		act(() => container.querySelector<HTMLButtonElement>('.tool-actions button')?.click());
		expect(container.querySelector('[role="status"]')?.textContent).toContain('unclosed string');
		expect(container.querySelector('[role="status"]')?.className).toContain('error');
	});

	it('clears input and the previous output', () => {
		act(() => setValue('.a { color: red; }'));
		act(() => container.querySelector<HTMLButtonElement>('.tool-actions button')?.click());
		act(() => container.querySelectorAll<HTMLButtonElement>('.tool-actions button')[2]?.click());
		expect(container.querySelector<HTMLTextAreaElement>('#css-minifier-input')?.value).toBe('');
		expect(container.querySelector('#css-minifier-output')?.textContent).toContain('minified CSS will appear');
	});
});
