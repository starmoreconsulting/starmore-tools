// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import HtmlMinifier from './HtmlMinifier';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const writeText = vi.fn();
let container: HTMLDivElement;
let root: Root;

function setValue(selector: string, value: string) {
	const input = container.querySelector<HTMLTextAreaElement>(selector);
	if (!input) throw new Error(`Missing input ${selector}`);
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
	act(() => root.render(<HtmlMinifier />));
});

afterEach(() => {
	act(() => root.unmount());
	container.remove();
});

describe('HtmlMinifier', () => {
	it('minifies HTML and copies the result', async () => {
		act(() => setValue('#html-minifier-input', '<p> Hello  world </p><!-- remove -->'));
		act(() => container.querySelector<HTMLButtonElement>('.tool-actions button')?.click());
		expect(container.querySelector('#html-minifier-output')?.textContent).toBe('<p> Hello world </p>');
		await act(async () => container.querySelectorAll<HTMLButtonElement>('.tool-actions button')[1]?.click());
		expect(writeText).toHaveBeenCalledWith('<p> Hello world </p>');
	});

	it('reports malformed markup without showing a result', () => {
		act(() => setValue('#html-minifier-input', '<script>unfinished'));
		act(() => container.querySelector<HTMLButtonElement>('.tool-actions button')?.click());
		expect(container.querySelector('[role="status"]')?.textContent).toContain('unclosed <script>');
		expect(container.querySelector('[role="status"]')?.className).toContain('error');
	});

	it('clears input and the previous output', () => {
		act(() => setValue('#html-minifier-input', '<p>hello</p>'));
		act(() => container.querySelector<HTMLButtonElement>('.tool-actions button')?.click());
		act(() => container.querySelectorAll<HTMLButtonElement>('.tool-actions button')[2]?.click());
		expect(container.querySelector<HTMLTextAreaElement>('#html-minifier-input')?.value).toBe('');
		expect(container.querySelector('#html-minifier-output')?.textContent).toContain('minified HTML will appear');
	});
});
