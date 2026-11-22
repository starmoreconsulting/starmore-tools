// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import JavaScriptMinifier from './JavaScriptMinifier';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const writeText = vi.fn();
let container: HTMLDivElement;
let root: Root;

function setValue(value: string) {
	const input = container.querySelector<HTMLTextAreaElement>('#javascript-minifier-input');
	if (!input) throw new Error('Missing JavaScript input');
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
	act(() => root.render(<JavaScriptMinifier />));
});

afterEach(() => {
	act(() => root.unmount());
	container.remove();
});

describe('JavaScriptMinifier', () => {
	it('minifies JavaScript and copies the result', async () => {
		act(() => setValue('const answer = 42;'));
		act(() => container.querySelector<HTMLButtonElement>('.tool-actions button')?.click());
		expect(container.querySelector('#javascript-minifier-output')?.textContent).toBe('const answer=42;');
		await act(async () => container.querySelectorAll<HTMLButtonElement>('.tool-actions button')[1]?.click());
		expect(writeText).toHaveBeenCalledWith('const answer=42;');
	});

	it('reports malformed input without showing a result', () => {
		act(() => setValue('const value = "unfinished'));
		act(() => container.querySelector<HTMLButtonElement>('.tool-actions button')?.click());
		expect(container.querySelector('[role="status"]')?.textContent).toContain('unclosed string');
		expect(container.querySelector('[role="status"]')?.className).toContain('error');
	});

	it('clears input and the previous output', () => {
		act(() => setValue('const answer = 42;'));
		act(() => container.querySelector<HTMLButtonElement>('.tool-actions button')?.click());
		act(() => container.querySelectorAll<HTMLButtonElement>('.tool-actions button')[2]?.click());
		expect(container.querySelector<HTMLTextAreaElement>('#javascript-minifier-input')?.value).toBe('');
		expect(container.querySelector('#javascript-minifier-output')?.textContent).toContain('minified JavaScript will appear');
	});
});
