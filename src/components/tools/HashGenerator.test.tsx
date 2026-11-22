// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import HashGenerator from './HashGenerator';
import { webcrypto } from 'node:crypto';

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
	Object.defineProperty(globalThis, 'crypto', { configurable: true, value: webcrypto });
	writeText.mockReset();
	Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
	container = document.createElement('div');
	document.body.append(container);
	root = createRoot(container);
	act(() => root.render(<HashGenerator />));
});

afterEach(() => {
	act(() => root.unmount());
	container.remove();
});

describe('HashGenerator', () => {
	it('generates and copies a SHA-256 hash', async () => {
		act(() => setValue('#hash-text', 'abc'));
		await act(async () => { container.querySelector<HTMLButtonElement>('.tool-actions button')?.click(); await new Promise((resolve) => setTimeout(resolve, 20)); });
		const value = container.querySelector('#hash-output')?.textContent ?? '';
		expect(value).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
		await act(async () => container.querySelectorAll<HTMLButtonElement>('.tool-actions button')[1]?.click());
		expect(writeText).toHaveBeenCalledWith(value);
	});

	it('supports uppercase output and SHA-1', async () => {
		act(() => setValue('#hash-algorithm', 'SHA-1'));
		act(() => setValue('#hash-uppercase', 'uppercase'));
		act(() => setValue('#hash-text', 'abc'));
		await act(async () => { container.querySelector<HTMLButtonElement>('.tool-actions button')?.click(); await new Promise((resolve) => setTimeout(resolve, 20)); });
		expect(container.querySelector('#hash-output')?.textContent).toBe('A9993E364706816ABA3E25717850C26C9CD0D89D');
	});

	it('clears text and generated output', async () => {
		act(() => setValue('#hash-text', 'abc'));
		await act(async () => { container.querySelector<HTMLButtonElement>('.tool-actions button')?.click(); await new Promise((resolve) => setTimeout(resolve, 20)); });
		act(() => container.querySelectorAll<HTMLButtonElement>('.tool-actions button')[2]?.click());
		expect(container.querySelector<HTMLTextAreaElement>('#hash-text')?.value).toBe('');
		expect(container.querySelector('#hash-output')?.textContent).toContain('hash will appear');
	});
});
