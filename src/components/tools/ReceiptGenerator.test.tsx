// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReceiptGeneratorInput } from '../../engines/receipt-generator';
import ReceiptGenerator from './ReceiptGenerator';

const { createReceiptDocument, triggerDownload } = vi.hoisted(() => ({
	createReceiptDocument: vi.fn(async (_input: ReceiptGeneratorInput) => new Uint8Array([37, 80, 68, 70])),
	triggerDownload: vi.fn(),
}));

vi.mock('../../engines/receipt-generator', async (importOriginal) => {
	const original = await importOriginal<typeof import('../../engines/receipt-generator')>();
	return { ...original, createReceiptDocument: (input: ReceiptGeneratorInput) => createReceiptDocument(input) };
});

vi.mock('../../engines/pdf', () => ({ triggerDownload }));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
	createReceiptDocument.mockClear();
	triggerDownload.mockClear();
	container = document.createElement('div');
	document.body.append(container);
	root = createRoot(container);
	act(() => root.render(<ReceiptGenerator />));
});

afterEach(() => {
	act(() => root.unmount());
	container.remove();
});

describe('ReceiptGenerator', () => {
	it('shows payment details, a receipt preview, and amount received', () => {
		expect(container.querySelector('.invoice-generator-preview')?.textContent).toContain('RECEIPT');
		expect(container.querySelector('label[for="receipt-method"]')?.textContent).toBe('Payment method');
		expect(container.querySelector('.invoice-generator-summary')?.textContent).toContain('NGN 0.00');
	});

	it('adds purchased items to the receipt', () => {
		act(() => Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find((button) => button.textContent?.includes('Add paid item'))?.click());
		expect(container.querySelectorAll('input[aria-label*="Receipt item"][aria-label*="description"]')).toHaveLength(2);
	});

	it('downloads the receipt PDF', async () => {
		await act(async () => container.querySelector<HTMLButtonElement>('.tool-actions button')?.click());
		expect(createReceiptDocument).toHaveBeenCalledTimes(1);
		expect(triggerDownload).toHaveBeenCalledTimes(1);
		expect(triggerDownload.mock.calls[0]?.[1]).toMatch(/\.pdf$/);
	});
});
