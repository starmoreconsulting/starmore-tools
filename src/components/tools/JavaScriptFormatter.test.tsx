// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import JavaScriptFormatter from './JavaScriptFormatter';

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
	act(() => root.render(<JavaScriptFormatter />));
});

afterEach(() => {
	act(() => root.unmount());
	container.remove();
});

describe('JavaScriptFormatter', () => {
	it('formats JavaScript and copies the result', async () => {
		act(() => setValue('#javascript-format-input', 'const value={answer:42};'));
		act(() => container.querySelector<HTMLButtonElement>('.tool-actions button')?.click());
		expect(container.querySelector('#javascript-format-output')?.textContent).toBe('const value = {\n  answer: 42\n};');
		await act(async () => container.querySelectorAll<HTMLButtonElement>('.tool-actions button')[1]?.click());
		expect(writeText).toHaveBeenCalledWith('const value = {\n  answer: 42\n};');
	});

	it('reports malformed input without showing a formatted result', () => {
		act(() => setValue('#javascript-format-input', 'function f( {'));
		act(() => container.querySelector<HTMLButtonElement>('.tool-actions button')?.click());
		expect(container.querySelector('[role="status"]')?.textContent).toContain('unclosed');
		expect(container.querySelector('[role="status"]')?.className).toContain('error');
	});

	it('clears the input and previous output', () => {
		act(() => setValue('#javascript-format-input', 'const answer=42;'));
		act(() => container.querySelector<HTMLButtonElement>('.tool-actions button')?.click());
		act(() => container.querySelectorAll<HTMLButtonElement>('.tool-actions button')[2]?.click());
		expect(container.querySelector<HTMLTextAreaElement>('#javascript-format-input')?.value).toBe('');
		expect(container.querySelector('#javascript-format-output')?.textContent).toContain('formatted JavaScript will appear');
	});
});
