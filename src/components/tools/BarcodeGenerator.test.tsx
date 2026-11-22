// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import BarcodeGenerator from './BarcodeGenerator';

const barcodeEncoder = vi.hoisted(() => vi.fn());
vi.mock('jsbarcode', () => ({ default: barcodeEncoder }));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
	barcodeEncoder.mockImplementation((svg: SVGSVGElement, text: string) => {
		svg.setAttribute('width', '300');
		svg.setAttribute('height', '150');
		const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
		label.textContent = text;
		svg.append(label);
	});
	container = document.createElement('div');
	document.body.append(container);
	root = createRoot(container);
	act(() => root.render(<BarcodeGenerator />));
});

afterEach(() => {
	act(() => root.unmount());
	container.remove();
	barcodeEncoder.mockReset();
});

describe('BarcodeGenerator', () => {
	it('generates Code 128 locally and enables vector and PNG downloads', () => {
		const input = container.querySelector<HTMLInputElement>('#barcode-value')!;
		act(() => {
			const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
			setter?.call(input, 'ITEM-2048');
			input.dispatchEvent(new Event('input', { bubbles: true }));
			container.querySelector<HTMLButtonElement>('button')?.click();
		});

		expect(barcodeEncoder).toHaveBeenCalledWith(
			expect.any(SVGSVGElement),
			'ITEM-2048',
			expect.objectContaining({ format: 'CODE128', displayValue: true }),
		);
		expect(container.querySelector('svg[role="img"]')?.getAttribute('aria-label')).toContain('ITEM-2048');
		expect([...container.querySelectorAll<HTMLButtonElement>('button')].filter((button) => button.textContent?.startsWith('Download')).every((button) => !button.disabled)).toBe(true);
	});

	it('requires a value and reports unsupported input clearly', () => {
		act(() => container.querySelector<HTMLButtonElement>('button')?.click());
		expect(container.textContent).toContain('Enter a value for the barcode.');

		barcodeEncoder.mockImplementation(() => { throw new Error('invalid character'); });
		const input = container.querySelector<HTMLInputElement>('#barcode-value')!;
		act(() => {
			const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
			setter?.call(input, '値');
			input.dispatchEvent(new Event('input', { bubbles: true }));
			[...container.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent === 'Generate barcode')?.click();
		});
		expect(container.textContent).toContain('Code 128 supports printable English letters, numbers, and standard punctuation.');
	});

	it('invalidates the generated barcode when its settings change', () => {
		const input = container.querySelector<HTMLInputElement>('#barcode-value')!;
		act(() => {
			const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
			setter?.call(input, 'A123');
			input.dispatchEvent(new Event('input', { bubbles: true }));
			[...container.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent === 'Generate barcode')?.click();
		});
		expect([...container.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent === 'Download SVG')?.disabled).toBe(false);
		act(() => {
			const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
			setter?.call(input, 'B456');
			input.dispatchEvent(new Event('input', { bubbles: true }));
		});
		expect([...container.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent === 'Download SVG')?.disabled).toBe(true);
	});
});
