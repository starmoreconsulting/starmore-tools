// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import CsvToJsonConverter from './CsvToJsonConverter';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
	container = document.createElement('div');
	document.body.append(container);
	root = createRoot(container);
	act(() => root.render(<CsvToJsonConverter />));
});

afterEach(() => {
	act(() => root.unmount());
	container.remove();
});

function enterCsv(csv: string): void {
	const textarea = container.querySelector<HTMLTextAreaElement>('#csv-to-json-input')!;
	const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
	setter?.call(textarea, csv);
	textarea.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('CsvToJsonConverter', () => {
	it('converts CSV records and enables output actions', () => {
		act(() => {
			enterCsv('name,age\nAda,36');
			container.querySelector<HTMLButtonElement>('button')?.click();
		});
		expect(container.querySelector('#csv-to-json-output')?.textContent).toContain('"name": "Ada"');
		expect(container.querySelector('#csv-to-json-output')?.textContent).toContain('"age": "36"');
		expect(container.textContent).toContain('CSV converted to JSON successfully.');
		expect([...container.querySelectorAll<HTMLButtonElement>('button')].filter((button) => button.disabled)).toHaveLength(0);
	});

	it('shows validation errors and does not leave stale output', () => {
		act(() => {
			enterCsv('name,age\nAda,36');
			container.querySelector<HTMLButtonElement>('button')?.click();
			enterCsv('name,age\nAda');
			container.querySelector<HTMLButtonElement>('button')?.click();
		});
		expect(container.querySelector('#csv-to-json-output')?.textContent).toContain('Your JSON result will appear here.');
		expect(container.textContent).toContain('Row 2 has 1 columns');
		expect(container.querySelector('.tool-message.error')).not.toBeNull();
	});

	it('clears input and output', () => {
		act(() => {
			enterCsv('name\nAda');
			container.querySelector<HTMLButtonElement>('button')?.click();
		});
		act(() => {
			[...container.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent === 'Clear')?.click();
		});
		expect(container.querySelector<HTMLTextAreaElement>('#csv-to-json-input')?.value).toBe('');
		expect(container.querySelector('#csv-to-json-output')?.textContent).toContain('Your JSON result will appear here.');
	});
});
