// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PurchaseOrderInput } from '../../engines/purchase-order-generator';
import PurchaseOrderGenerator from './PurchaseOrderGenerator';

const { createPurchaseOrderDocument, triggerDownload } = vi.hoisted(() => ({
	createPurchaseOrderDocument: vi.fn(async (_input: PurchaseOrderInput) => new Uint8Array([37, 80, 68, 70])),
	triggerDownload: vi.fn(),
}));

vi.mock('../../engines/purchase-order-generator', async (importOriginal) => {
	const original = await importOriginal<typeof import('../../engines/purchase-order-generator')>();
	return { ...original, createPurchaseOrderDocument: (input: PurchaseOrderInput) => createPurchaseOrderDocument(input) };
});

vi.mock('../../engines/pdf', () => ({ triggerDownload }));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
	createPurchaseOrderDocument.mockClear();
	triggerDownload.mockClear();
	container = document.createElement('div');
	document.body.append(container);
	root = createRoot(container);
	act(() => root.render(<PurchaseOrderGenerator />));
});

afterEach(() => {
	act(() => root.unmount());
	container.remove();
});

describe('PurchaseOrderGenerator', () => {
	it('shows buyer, supplier, and expected delivery details', () => {
		const preview = container.querySelector('.invoice-generator-preview');
		expect(preview?.textContent).toContain('PURCHASE ORDER');
		expect(preview?.textContent).toContain('SUPPLIER');
		expect(container.querySelector('label[for="po-delivery-date"]')?.textContent).toBe('Expected delivery date');
	});

	it('adds order items', () => {
		act(() => Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find((button) => button.textContent?.includes('Add order item'))?.click());
		expect(container.querySelectorAll('input[aria-label*="Order item"][aria-label*="description"]')).toHaveLength(2);
	});

	it('downloads the purchase order PDF', async () => {
		await act(async () => container.querySelector<HTMLButtonElement>('.tool-actions button')?.click());
		expect(createPurchaseOrderDocument).toHaveBeenCalledTimes(1);
		expect(triggerDownload).toHaveBeenCalledTimes(1);
		expect(triggerDownload.mock.calls[0]?.[1]).toMatch(/\.pdf$/);
	});
});
