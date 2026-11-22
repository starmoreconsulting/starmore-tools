// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import HtmlFormatter from './HtmlFormatter';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const writeText = vi.fn();
let container: HTMLDivElement;
let root: Root;

function setValue(selector: string, value: string) {
	const input = container.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(selector);
	if (!input) throw new Error(`Missing input ${selector}`);
	const prototype = input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype
		: input instanceof HTMLSelectElement ? HTMLSelectElement.prototype
			: HTMLInputElement.prototype;
	Object.getOwnPropertyDescriptor(prototype, 'value')?.set?.call(input, value);
	input.dispatchEvent(new Event('input', { bubbles: true }));
	input.dispatchEvent(new Event('change', { bubbles: true }));
}

beforeEach(() => {
	writeText.mockReset();
	Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
	container = document.createElement('div');
	document.body.append(container);
	root = createRoot(container);
	act(() => root.render(<HtmlFormatter />));
});

afterEach(() => {
	act(() => root.unmount());
	container.remove();
});

describe('HtmlFormatter', () => {
	it('formats HTML and offers a copy action', async () => {
		act(() => setValue('#html-format-input', '<div><p>Hello</p></div>'));
		act(() => container.querySelector<HTMLButtonElement>('.tool-actions button')?.click());
		expect(container.querySelector('#html-format-output')?.textContent).toBe('<div>\n  <p>Hello</p>\n</div>');
		await act(async () => container.querySelectorAll<HTMLButtonElement>('.tool-actions button')[1]?.click());
		expect(writeText).toHaveBeenCalledWith('<div>\n  <p>Hello</p>\n</div>');
	});

	it('shows a useful error for unfinished HTML markup', () => {
		act(() => setValue('#html-format-input', '<div title="unfinished></div>'));
		act(() => container.querySelector<HTMLButtonElement>('.tool-actions button')?.click());
		expect(container.querySelector('[role="status"]')?.textContent).toContain('unclosed quoted attribute');
		expect(container.querySelector('[role="status"]')?.className).toContain('error');
	});

	it('clears input and the previous output', () => {
		act(() => setValue('#html-format-input', '<p>Hello</p>'));
		act(() => container.querySelector<HTMLButtonElement>('.tool-actions button')?.click());
		act(() => container.querySelectorAll<HTMLButtonElement>('.tool-actions button')[2]?.click());
		expect(container.querySelector<HTMLTextAreaElement>('#html-format-input')?.value).toBe('');
		expect(container.querySelector('#html-format-output')?.textContent).toContain('formatted HTML will appear');
	});
});
