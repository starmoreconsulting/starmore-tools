// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import Notepad from './Notepad';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
	localStorage.clear();
	container = document.createElement('div');
	document.body.append(container);
	root = createRoot(container);
	act(() => root.render(<Notepad />));
});

afterEach(() => {
	act(() => root.unmount());
	container.remove();
});

describe('Notepad', () => {
	it('edits and autosaves a local note', () => {
		const title = container.querySelector<HTMLInputElement>('#notepad-title')!;
		const text = container.querySelector<HTMLTextAreaElement>('#notepad-text')!;
		act(() => {
			const titleSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
			titleSetter?.call(title, 'Meeting Notes');
			title.dispatchEvent(new Event('input', { bubbles: true }));
			const textSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
			textSetter?.call(text, 'Hello world');
			text.dispatchEvent(new Event('input', { bubbles: true }));
		});
		expect(container.textContent).toContain('2 words');
		expect(JSON.parse(localStorage.getItem('starmore-notepad-v1') || '{}')).toEqual({ title: 'Meeting Notes', text: 'Hello world' });
	});

	it('clears into a new local note', () => {
		act(() => container.querySelectorAll<HTMLButtonElement>('button')[1].click());
		expect(container.querySelector<HTMLInputElement>('#notepad-title')?.value).toBe('');
		expect(container.querySelector<HTMLTextAreaElement>('#notepad-text')?.value).toBe('');
		expect(container.querySelector('[role="status"]')?.textContent).toContain('New local note');
	});
});
