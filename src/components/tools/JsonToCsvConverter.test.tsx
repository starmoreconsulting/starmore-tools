// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import JsonToCsvConverter from './JsonToCsvConverter';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
	container = document.createElement('div');
	document.body.append(container);
	root = createRoot(container);
	act(() => root.render(<JsonToCsvConverter />));
});

afterEach(() => {
	act(() => root.unmount());
	container.remove();
});

function setInput(value: string): void {
	const textarea = container.querySelector<HTMLTextAreaElement>('#json-to-csv-input')!;
	const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
	setter?.call(textarea, value);
	textarea.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('JsonToCsvConverter', () => {
	it('converts records and protects formula-like cells by default', () => {
		act(() => {
			setInput('[{"name":"Ada","value":"=1+1"}]');
			[...container.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent === 'Convert to CSV')?.click();
		});
		expect(container.querySelector('#json-to-csv-output')?.textContent).toContain('"\'=1+1"');
		expect(container.textContent).toContain('Protected 1 formula-like cell');
	});

	it('allows turning formula protection off to preserve exact text', () => {
		act(() => {
			container.querySelector<HTMLInputElement>('input[type="checkbox"]')?.click();
			setInput('[{"value":"=1+1"}]');
			[...container.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent === 'Convert to CSV')?.click();
		});
		expect(container.querySelector('#json-to-csv-output')?.textContent).toContain('"=1+1"');
	});

	it('shows validation errors and clears stale output', () => {
		act(() => {
			setInput('[{"name":"Ada"}]');
			[...container.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent === 'Convert to CSV')?.click();
			setInput('{"name":"Ada"}');
			[...container.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent === 'Convert to CSV')?.click();
		});
		expect(container.querySelector('#json-to-csv-output')?.textContent).toContain('Your CSV result will appear here.');
		expect(container.textContent).toContain('non-empty JSON array');
	});
});
