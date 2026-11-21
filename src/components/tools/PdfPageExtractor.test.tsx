// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import PdfPageExtractor from './PdfPageExtractor';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let container: HTMLDivElement;
let root: Root;

beforeEach(() => { container = document.createElement('div'); document.body.append(container); root = createRoot(container); act(() => root.render(<PdfPageExtractor />)); });
afterEach(() => { act(() => root.unmount()); container.remove(); });

describe('PdfPageExtractor', () => {
	it('starts disabled until a file and page ranges are selected', () => {
		expect(container.querySelector<HTMLInputElement>('#pdf-extract-file')).not.toBeNull();
		expect(container.querySelector<HTMLInputElement>('#pdf-extract-ranges')).not.toBeNull();
		expect(container.querySelector<HTMLButtonElement>('button')?.disabled).toBe(true);
	});

	it('requires a range to enable extraction after a file is selected', () => {
		const input = container.querySelector<HTMLInputElement>('#pdf-extract-file')!;
		Object.defineProperty(input, 'files', { value: [new File(['pdf'], 'sample.pdf', { type: 'application/pdf' })], configurable: true });
		act(() => input.dispatchEvent(new Event('change', { bubbles: true })));
		expect(container.querySelector<HTMLButtonElement>('button')?.disabled).toBe(true);
		const range = container.querySelector<HTMLInputElement>('#pdf-extract-ranges')!;
		act(() => {
			const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
			setter?.call(range, '1-2');
			range.dispatchEvent(new Event('input', { bubbles: true }));
		});
		expect(container.querySelector<HTMLButtonElement>('button')?.disabled).toBe(false);
	});
});
