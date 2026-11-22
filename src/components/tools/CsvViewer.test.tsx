// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import CsvViewer from './CsvViewer';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
	container = document.createElement('div');
	document.body.append(container);
	root = createRoot(container);
	act(() => root.render(<CsvViewer />));
});

afterEach(() => {
	act(() => root.unmount());
	container.remove();
});

function setCsv(value: string): void {
	const textarea = container.querySelector<HTMLTextAreaElement>('#csv-viewer-input')!;
	const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
	setter?.call(textarea, value);
	textarea.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('CsvViewer', () => {
	it('previews parsed cells in a table', () => {
		act(() => {
			setCsv('name,note\nAda,"Hello, world"');
			[...container.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent === 'Preview CSV')?.click();
		});
		expect(container.querySelector('table thead')?.textContent).toBe('namenote');
		expect(container.querySelector('table tbody')?.textContent).toContain('Ada');
		expect(container.querySelector('table tbody')?.textContent).toContain('Hello, world');
		expect(container.textContent).toContain('Loaded 1 data row and 2 columns.');
	});

	it('filters rows across all columns', () => {
		act(() => {
			setCsv('name,city\nAda,Lagos\nLin,Accra');
			container.querySelector<HTMLButtonElement>('[type="button"]')?.click();
		});
		const search = container.querySelector<HTMLInputElement>('#csv-viewer-search')!;
		act(() => {
			const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
			setter?.call(search, 'acc');
			search.dispatchEvent(new Event('input', { bubbles: true }));
		});
		expect(container.querySelector('table tbody')?.textContent).toContain('Lin');
		expect(container.querySelector('table tbody')?.textContent).not.toContain('Ada');
	});

	it('shows malformed CSV errors and clears the table', () => {
		act(() => {
			setCsv('name\nAda');
			container.querySelector<HTMLButtonElement>('[type="button"]')?.click();
			setCsv('name,note\nAda,"open');
			[...container.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent === 'Preview CSV')?.click();
		});
		expect(container.querySelector('table')).toBeNull();
		expect(container.textContent).toContain('A quoted field is not closed.');
	});

	it('clears loaded CSV state', () => {
		act(() => {
			setCsv('name\nAda');
			container.querySelector<HTMLButtonElement>('[type="button"]')?.click();
			[...container.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent === 'Clear')?.click();
		});
		expect(container.querySelector('table')).toBeNull();
		expect(container.querySelector<HTMLTextAreaElement>('#csv-viewer-input')?.value).toBe('');
	});
});
