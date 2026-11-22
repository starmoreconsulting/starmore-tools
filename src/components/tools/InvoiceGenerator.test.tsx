// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import InvoiceGenerator from './InvoiceGenerator';
import type { InvoiceGeneratorInput } from '../../engines/invoice-generator';

const { createInvoicePdf, triggerDownload } = vi.hoisted(() => ({
	createInvoicePdf: vi.fn(async (_input: InvoiceGeneratorInput) => new Uint8Array([37, 80, 68, 70])),
	triggerDownload: vi.fn(),
}));

vi.mock('../../engines/invoice-generator', async (importOriginal) => {
	const original = await importOriginal<typeof import('../../engines/invoice-generator')>();
	return { ...original, createInvoicePdf: (input: InvoiceGeneratorInput) => createInvoicePdf(input) };
});

vi.mock('../../engines/pdf', () => ({
	pdfErrorMessage: (error: unknown) => error instanceof Error ? error.message : 'PDF error',
	triggerDownload,
}));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
	createInvoicePdf.mockClear();
	triggerDownload.mockClear();
	container = document.createElement('div');
	document.body.append(container);
	root = createRoot(container);
	act(() => root.render(<InvoiceGenerator />));
});

afterEach(() => {
	act(() => root.unmount());
	container.remove();
});

describe('InvoiceGenerator', () => {
	it('shows invoice details, editable line items, and a live total', () => {
		expect(container.querySelector('.invoice-generator-preview')?.textContent).toContain('INVOICE');
		expect(container.querySelector('input[aria-label="Item 1 description"]')).not.toBeNull();
		expect(container.querySelector('.invoice-generator-summary')?.textContent).toContain('NGN 0.00');
	});

	it('adds and removes invoice lines and updates the total', () => {
		const addButton = Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find((button) => button.textContent?.includes('Add line item'));
		act(() => addButton?.click());
		expect(container.querySelectorAll('.invoice-generator-items input[aria-label*="description"]')).toHaveLength(2);
		act(() => container.querySelector<HTMLButtonElement>('button[aria-label="Remove item 2"]')?.click());
		expect(container.querySelectorAll('.invoice-generator-items input[aria-label*="description"]')).toHaveLength(1);

		act(() => {
			const price = container.querySelector<HTMLInputElement>('input[aria-label="Item 1 unit price"]');
			if (price) {
				const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
				setter?.call(price, '125');
				price.dispatchEvent(new Event('input', { bubbles: true }));
				price.dispatchEvent(new Event('change', { bubbles: true }));
			}
		});
		expect(container.querySelector('.invoice-generator-summary')?.textContent).toContain('NGN 125.00');
	});

	it('downloads the generated invoice PDF using the invoice number as a filename', async () => {
		const downloadButton = container.querySelector<HTMLButtonElement>('.tool-actions button');
		await act(async () => { downloadButton?.click(); });
		expect(createInvoicePdf).toHaveBeenCalledTimes(1);
		expect(triggerDownload).toHaveBeenCalledTimes(1);
		expect(triggerDownload.mock.calls[0]?.[1]).toMatch(/\.pdf$/);
	});
});
