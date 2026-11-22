// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { QuotationGeneratorInput } from '../../engines/quotation-generator';
import QuotationGenerator from './QuotationGenerator';

const { createQuotationDocument, triggerDownload } = vi.hoisted(() => ({
	createQuotationDocument: vi.fn(async (_input: QuotationGeneratorInput) => new Uint8Array([37, 80, 68, 70])),
	triggerDownload: vi.fn(),
}));

vi.mock('../../engines/quotation-generator', async (importOriginal) => {
	const original = await importOriginal<typeof import('../../engines/quotation-generator')>();
	return { ...original, createQuotationDocument: (input: QuotationGeneratorInput) => createQuotationDocument(input) };
});

vi.mock('../../engines/pdf', () => ({ triggerDownload }));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
	createQuotationDocument.mockClear();
	triggerDownload.mockClear();
	container = document.createElement('div');
	document.body.append(container);
	root = createRoot(container);
	act(() => root.render(<QuotationGenerator />));
});

afterEach(() => {
	act(() => root.unmount());
	container.remove();
});

describe('QuotationGenerator', () => {
	it('shows a quotation preview and validity date controls', () => {
		expect(container.querySelector('.invoice-generator-preview')?.textContent).toContain('QUOTATION');
		expect(container.querySelector('label[for="quotation-valid-until"]')?.textContent).toBe('Valid until');
		expect(container.querySelector('input[aria-label="Quoted item 1 description"]')).not.toBeNull();
	});

	it('adds quoted items to the live preview', () => {
		act(() => Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find((button) => button.textContent?.includes('Add quoted item'))?.click());
		expect(container.querySelectorAll('input[aria-label*="Quoted item"][aria-label*="description"]')).toHaveLength(2);
	});

	it('downloads the generated quote as a PDF', async () => {
		await act(async () => container.querySelector<HTMLButtonElement>('.tool-actions button')?.click());
		expect(createQuotationDocument).toHaveBeenCalledTimes(1);
		expect(triggerDownload).toHaveBeenCalledTimes(1);
		expect(triggerDownload.mock.calls[0]?.[1]).toMatch(/\.pdf$/);
	});
});
