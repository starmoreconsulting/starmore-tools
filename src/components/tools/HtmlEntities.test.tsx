// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import HtmlEntities from './HtmlEntities';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const writeText = vi.fn();
let container: HTMLDivElement;
let root: Root;

function setValue(value: string) {
	const input = container.querySelector<HTMLTextAreaElement>('#html-entities-input');
	if (!input) throw new Error('Missing HTML entity input');
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
	act(() => root.render(<HtmlEntities />));
});

afterEach(() => {
	act(() => root.unmount());
	container.remove();
});

describe('HtmlEntities', () => {
	it('encodes HTML-sensitive characters and copies the result', async () => {
		act(() => setValue('<p title="A & B">'));
		act(() => container.querySelector<HTMLButtonElement>('.tool-actions button')?.click());
		expect(container.querySelector('#html-entities-output')?.textContent).toBe('&lt;p title=&quot;A &amp; B&quot;&gt;');
		await act(async () => container.querySelectorAll<HTMLButtonElement>('.tool-actions button')[2]?.click());
		expect(writeText).toHaveBeenCalledWith('&lt;p title=&quot;A &amp; B&quot;&gt;');
	});

	it('decodes named and numeric entities', () => {
		act(() => setValue('&lt;b&gt;&amp;&#65;'));
		act(() => container.querySelectorAll<HTMLButtonElement>('.tool-actions button')[1]?.click());
		expect(container.querySelector('#html-entities-output')?.textContent).toBe('<b>&A');
	});

	it('reports unknown entities and clears input', () => {
		act(() => setValue('&unknown;'));
		act(() => container.querySelectorAll<HTMLButtonElement>('.tool-actions button')[1]?.click());
		expect(container.querySelector('[role="status"]')?.textContent).toContain('Unknown named HTML entity');
		expect(container.querySelector('[role="status"]')?.className).toContain('error');
		act(() => container.querySelectorAll<HTMLButtonElement>('.tool-actions button')[3]?.click());
		expect(container.querySelector<HTMLTextAreaElement>('#html-entities-input')?.value).toBe('');
		expect(container.querySelector('#html-entities-output')?.textContent).toContain('encoded or decoded result will appear');
	});
});
