// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import RegexTester from './RegexTester';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const writeText = vi.fn();
let container: HTMLDivElement;
let root: Root;

function setValue(selector: string, value: string) {
	const input = container.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector);
	if (!input) throw new Error(`Missing input ${selector}`);
	const prototype = input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
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
	act(() => root.render(<RegexTester />));
});

afterEach(() => { act(() => root.unmount()); container.remove(); });

describe('RegexTester', () => {
	it('shows matches and named/capturing groups', () => {
		act(() => setValue('#regex-pattern', '(?<word>\\w+)@(\\w+\\.\\w+)'));
		act(() => setValue('#regex-text', 'a@b.com c@d.org'));
		expect(container.textContent).toContain('2 matches');
		expect(container.textContent).toContain('a@b.com');
		expect(container.textContent).toContain('Named: word: a');
		expect(container.textContent).toContain('Groups: 1: a · 2: b.com');
	});

	it('shows a replacement preview', () => {
		act(() => setValue('#regex-pattern', 'world'));
		act(() => setValue('#regex-text', 'Hello world'));
		const checkbox = container.querySelector<HTMLInputElement>('fieldset input');
		act(() => checkbox?.click());
		act(() => setValue('#regex-replacement-value', 'earth'));
		expect((container.querySelector('#regex-replacement') as HTMLTextAreaElement | null)?.value).toBe('Hello earth');
	});

	it('reports invalid regex and clears fields', () => {
		act(() => setValue('#regex-pattern', '('));
		act(() => setValue('#regex-text', 'text'));
		expect(container.querySelector('[role="status"]')?.textContent).not.toBe('');
		act(() => container.querySelectorAll<HTMLButtonElement>('.tool-actions button')[2]?.click());
		expect(container.querySelector<HTMLInputElement>('#regex-pattern')?.value).toBe('');
		expect(container.querySelector<HTMLTextAreaElement>('#regex-text')?.value).toBe('');
	});

	it('copies matched text', async () => {
		act(() => setValue('#regex-pattern', '\\d+'));
		act(() => setValue('#regex-text', 'A1 B22'));
		await act(async () => container.querySelectorAll<HTMLButtonElement>('.tool-actions button')[1]?.click());
		expect(writeText).toHaveBeenCalledWith('1\n22');
	});
});
