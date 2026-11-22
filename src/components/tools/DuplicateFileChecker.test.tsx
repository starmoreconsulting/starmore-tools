// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import DuplicateFileChecker from './DuplicateFileChecker';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
	container = document.createElement('div');
	document.body.append(container);
	root = createRoot(container);
	act(() => root.render(<DuplicateFileChecker />));
});

afterEach(() => {
	act(() => root.unmount());
	container.remove();
});

describe('DuplicateFileChecker', () => {
	it('renders file selection and keeps scanning disabled until two files are chosen', () => {
		expect(container.querySelector<HTMLInputElement>('#duplicate-checker-files')?.multiple).toBe(true);
		expect(container.querySelector<HTMLButtonElement>('button')?.disabled).toBe(true);
		expect(container.textContent).toContain('never uploaded');
	});

	it('lists selected files and allows removing them', () => {
		const input = container.querySelector<HTMLInputElement>('#duplicate-checker-files')!;
		Object.defineProperty(input, 'files', {
			configurable: true,
			value: [new File(['a'], 'first.txt'), new File(['b'], 'second.txt')],
		});
		act(() => input.dispatchEvent(new Event('change', { bubbles: true })));
		expect(container.textContent).toContain('first.txt');
		expect(container.textContent).toContain('second.txt');
		expect([...container.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent === 'Find duplicate files')?.disabled).toBe(false);
		act(() => container.querySelector<HTMLButtonElement>('button[aria-label="Remove first.txt"]')?.click());
		expect(container.textContent).not.toContain('first.txt');
		expect([...container.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent === 'Find duplicate files')?.disabled).toBe(true);
	});

	it('shows matching files only after their contents are hashed', async () => {
		const input = container.querySelector<HTMLInputElement>('#duplicate-checker-files')!;
		Object.defineProperty(input, 'files', {
			configurable: true,
			value: [new File(['same bytes'], 'original.txt'), new File(['same bytes'], 'copy.bin')],
		});
		act(() => input.dispatchEvent(new Event('change', { bubbles: true })));
		await act(async () => {
			[...container.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent === 'Find duplicate files')?.click();
			await new Promise((resolve) => setTimeout(resolve, 0));
		});
		expect(container.textContent).toContain('Found 1 group');
		expect(container.textContent).toContain('original.txt');
		expect(container.textContent).toContain('copy.bin');
	});
});
