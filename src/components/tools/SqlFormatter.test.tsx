// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SqlFormatter from './SqlFormatter';

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
	act(() => root.render(<SqlFormatter />));
});

afterEach(() => { act(() => root.unmount()); container.remove(); });

describe('SqlFormatter', () => {
	it('formats SQL and copies the result', async () => {
		act(() => setValue('#sql-format-input', 'select id,name from users where active=1'));
		act(() => container.querySelector<HTMLButtonElement>('.tool-actions button')?.click());
		expect(container.querySelector('#sql-format-output')?.textContent).toContain('SELECT id');
		expect(container.querySelector('#sql-format-output')?.textContent).toContain('FROM users');
		await act(async () => container.querySelectorAll<HTMLButtonElement>('.tool-actions button')[1]?.click());
		expect(writeText).toHaveBeenCalled();
	});

	it('supports keyword casing and reports malformed SQL', () => {
		act(() => setValue('#sql-keyword-case', 'lower'));
		act(() => setValue('#sql-format-input', 'SELECT id FROM users'));
		act(() => container.querySelector<HTMLButtonElement>('.tool-actions button')?.click());
		expect(container.querySelector('#sql-format-output')?.textContent).toContain('select id');
		act(() => setValue('#sql-format-input', "select 'unfinished"));
		act(() => container.querySelector<HTMLButtonElement>('.tool-actions button')?.click());
		expect(container.querySelector('[role="status"]')?.textContent).toContain('unclosed string');
		expect(container.querySelector('[role="status"]')?.className).toContain('error');
	});

	it('clears input and output', () => {
		act(() => setValue('#sql-format-input', 'select id from users'));
		act(() => container.querySelector<HTMLButtonElement>('.tool-actions button')?.click());
		act(() => container.querySelectorAll<HTMLButtonElement>('.tool-actions button')[2]?.click());
		expect(container.querySelector<HTMLTextAreaElement>('#sql-format-input')?.value).toBe('');
		expect(container.querySelector('#sql-format-output')?.textContent).toContain('formatted SQL will appear');
	});
});
