// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import ZipCreator from './ZipCreator';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
	container = document.createElement('div');
	document.body.append(container);
	root = createRoot(container);
	act(() => root.render(<ZipCreator />));
});

afterEach(() => {
	act(() => root.unmount());
	container.remove();
});

describe('ZipCreator', () => {
	it('renders file selection, archive naming, and a disabled create action', () => {
		expect(container.querySelector<HTMLInputElement>('#zip-creator-files')?.multiple).toBe(true);
		expect(container.querySelector<HTMLInputElement>('#zip-creator-name')?.value).toBe('archive');
		expect(container.querySelector<HTMLButtonElement>('button')?.disabled).toBe(true);
		expect(container.textContent).toContain('Files stay on this device.');
	});

	it('shows selected files and permits removing them', () => {
		const input = container.querySelector<HTMLInputElement>('#zip-creator-files')!;
		const first = new File(['hello'], 'notes.txt');
		const second = new File(['data'], 'report.csv');
		Object.defineProperty(input, 'files', { configurable: true, value: [first, second] });
		act(() => input.dispatchEvent(new Event('change', { bubbles: true })));

		expect(container.textContent).toContain('notes.txt');
		expect(container.textContent).toContain('report.csv');
		expect([...container.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent === 'Create and download ZIP')?.disabled).toBe(false);
		act(() => container.querySelector<HTMLButtonElement>('button[aria-label="Remove notes.txt"]')?.click());
		expect(container.textContent).not.toContain('notes.txt');
		expect(container.textContent).toContain('report.csv');
	});
});
