// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import XmlFormatter from './XmlFormatter';

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
	act(() => root.render(<XmlFormatter />));
});

afterEach(() => { act(() => root.unmount()); container.remove(); });

describe('XmlFormatter', () => {
	it('formats XML and copies the result', async () => {
		act(() => setValue('#xml-format-input', '<root><item>Hi</item></root>'));
		act(() => container.querySelector<HTMLButtonElement>('.tool-actions button')?.click());
		expect(container.querySelector('#xml-format-output')?.textContent).toBe('<root>\n  <item>\n    Hi\n  </item>\n</root>');
		await act(async () => container.querySelectorAll<HTMLButtonElement>('.tool-actions button')[1]?.click());
		expect(writeText).toHaveBeenCalledWith('<root>\n  <item>\n    Hi\n  </item>\n</root>');
	});

	it('reports mismatched XML tags', () => {
		act(() => setValue('#xml-format-input', '<root><item></root>'));
		act(() => container.querySelector<HTMLButtonElement>('.tool-actions button')?.click());
		expect(container.querySelector('[role="status"]')?.textContent).toContain('closing tag mismatch');
		expect(container.querySelector('[role="status"]')?.className).toContain('error');
	});

	it('clears input and the previous output', () => {
		act(() => setValue('#xml-format-input', '<root/>'));
		act(() => container.querySelector<HTMLButtonElement>('.tool-actions button')?.click());
		act(() => container.querySelectorAll<HTMLButtonElement>('.tool-actions button')[2]?.click());
		expect(container.querySelector<HTMLTextAreaElement>('#xml-format-input')?.value).toBe('');
		expect(container.querySelector('#xml-format-output')?.textContent).toContain('formatted XML will appear');
	});
});
