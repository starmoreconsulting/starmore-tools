// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import UrlEncoder from './UrlEncoder';

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
	act(() => root.render(<UrlEncoder />));
});

afterEach(() => {
	act(() => root.unmount());
	container.remove();
});

describe('UrlEncoder', () => {
	it('encodes component text and copies the result', async () => {
		act(() => setValue('#url-encoder-input', 'hello world'));
		act(() => container.querySelector<HTMLButtonElement>('.tool-actions button')?.click());
		expect(container.querySelector('#url-encoder-output')?.textContent).toBe('hello%20world');
		await act(async () => container.querySelectorAll<HTMLButtonElement>('.tool-actions button')[2]?.click());
		expect(writeText).toHaveBeenCalledWith('hello%20world');
	});

	it('switches modes and decodes full URLs', () => {
		act(() => setValue('#url-encoding-mode', 'url'));
		act(() => setValue('#url-encoder-input', 'https://example.com/a%20b'));
		act(() => container.querySelectorAll<HTMLButtonElement>('.tool-actions button')[1]?.click());
		expect(container.querySelector('#url-encoder-output')?.textContent).toBe('https://example.com/a b');
	});

	it('reports invalid encoded input and clears the result', () => {
		act(() => setValue('#url-encoder-input', '%ZZ'));
		act(() => container.querySelectorAll<HTMLButtonElement>('.tool-actions button')[1]?.click());
		expect(container.querySelector('[role="status"]')?.textContent).toContain('invalid or incomplete');
		expect(container.querySelector('[role="status"]')?.className).toContain('error');
	});

	it('clears the input and previous output', () => {
		act(() => setValue('#url-encoder-input', 'hello world'));
		act(() => container.querySelector<HTMLButtonElement>('.tool-actions button')?.click());
		act(() => container.querySelectorAll<HTMLButtonElement>('.tool-actions button')[3]?.click());
		expect(container.querySelector<HTMLTextAreaElement>('#url-encoder-input')?.value).toBe('');
		expect(container.querySelector('#url-encoder-output')?.textContent).toContain('encoded or decoded result will appear');
	});
});
