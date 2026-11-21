// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import PdfPageRearranger from './PdfPageRearranger';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let container: HTMLDivElement;
let root: Root;

beforeEach(() => { container = document.createElement('div'); document.body.append(container); root = createRoot(container); act(() => root.render(<PdfPageRearranger />)); });
afterEach(() => { act(() => root.unmount()); container.remove(); });

describe('PdfPageRearranger', () => {
	it('starts disabled until a file and order are provided', () => {
		expect(container.querySelector('#pdf-rearrange-file')).not.toBeNull();
		expect(container.querySelector('#pdf-rearrange-order')).not.toBeNull();
		expect(container.querySelector<HTMLButtonElement>('button')?.disabled).toBe(true);
	});

	it('enables rearrangement after a file and order are entered', () => {
		const input = container.querySelector<HTMLInputElement>('#pdf-rearrange-file')!;
		Object.defineProperty(input, 'files', { value: [new File(['pdf'], 'sample.pdf', { type: 'application/pdf' })], configurable: true });
		act(() => input.dispatchEvent(new Event('input', { bubbles: true })));
		const order = container.querySelector<HTMLInputElement>('#pdf-rearrange-order')!;
		act(() => {
			const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
			setter?.call(order, '3, 1, 2');
			order.dispatchEvent(new Event('input', { bubbles: true }));
		});
		expect(container.querySelector<HTMLButtonElement>('button')?.disabled).toBe(false);
	});
});
