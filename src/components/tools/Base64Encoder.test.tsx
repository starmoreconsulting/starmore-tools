// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Base64Encoder from './Base64Encoder';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const writeText = vi.fn();
let container: HTMLDivElement;
let root: Root;

function setValue(value: string) {
	const input = container.querySelector<HTMLTextAreaElement>('#base64-input');
	if (!input) throw new Error('Missing Base64 input');
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
	act(() => root.render(<Base64Encoder />));
});

afterEach(() => {
	act(() => root.unmount());
	container.remove();
});

describe('Base64Encoder', () => {
	it('encodes and copies the result', async () => {
		act(() => setValue('Hello'));
		act(() => container.querySelector<HTMLButtonElement>('.tool-actions button')?.click());
		expect(container.querySelector('#base64-output')?.textContent).toBe('SGVsbG8=');
		await act(async () => container.querySelectorAll<HTMLButtonElement>('.tool-actions button')[2]?.click());
		expect(writeText).toHaveBeenCalledWith('SGVsbG8=');
	});

	it('reports invalid input and clears the result', () => {
		act(() => setValue('invalid!'));
		act(() => container.querySelectorAll<HTMLButtonElement>('.tool-actions button')[1]?.click());
		expect(container.querySelector('[role="status"]')?.textContent).toContain('standard alphabet');
		expect(container.querySelector('[role="status"]')?.className).toContain('error');
	});

	it('clears input and the previous output', () => {
		act(() => setValue('Hello'));
		act(() => container.querySelector<HTMLButtonElement>('.tool-actions button')?.click());
		act(() => container.querySelectorAll<HTMLButtonElement>('.tool-actions button')[3]?.click());
		expect(container.querySelector<HTMLTextAreaElement>('#base64-input')?.value).toBe('');
		expect(container.querySelector('#base64-output')?.textContent).toContain('encoded or decoded result will appear');
	});
});
