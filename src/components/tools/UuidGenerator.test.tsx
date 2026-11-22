// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import UuidGenerator from './UuidGenerator';

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
	act(() => root.render(<UuidGenerator />));
});

afterEach(() => {
	act(() => root.unmount());
	container.remove();
});

describe('UuidGenerator', () => {
	it('generates a UUID v4 and copies it', async () => {
		act(() => setValue('#uuid-quantity', '1'));
		act(() => container.querySelector<HTMLButtonElement>('.tool-actions button')?.click());
		const value = container.querySelector<HTMLTextAreaElement>('#generated-uuids')?.value ?? '';
		expect(value).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
		await act(async () => container.querySelectorAll<HTMLButtonElement>('.tool-actions button')[1]?.click());
		expect(writeText).toHaveBeenCalledWith(value);
	});

	it('generates multiple UUIDs and supports uppercase', () => {
		act(() => setValue('#uuid-quantity', '5'));
		const checkboxes = container.querySelectorAll<HTMLInputElement>('fieldset input');
		act(() => checkboxes[0].click());
		act(() => container.querySelector<HTMLButtonElement>('.tool-actions button')?.click());
		const value = container.querySelector<HTMLTextAreaElement>('#generated-uuids')?.value ?? '';
		expect(value.trim().split('\n')).toHaveLength(5);
		expect(value).toMatch(/[A-F]/);
	});

	it('validates UUID format and clears the output', () => {
		act(() => setValue('#uuid-validation', '12345678-abcd-4eef-8abf-1234567890ab'));
		expect(container.textContent).toContain('Valid UUID format.');
		act(() => setValue('#uuid-validation', 'not-a-uuid'));
		expect(container.textContent).toContain('Invalid UUID format.');
	});
});
