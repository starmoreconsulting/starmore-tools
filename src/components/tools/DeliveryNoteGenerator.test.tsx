// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DeliveryNoteInput } from '../../engines/delivery-note';
import DeliveryNoteGenerator from './DeliveryNoteGenerator';

const { createDeliveryNotePdf, triggerDownload } = vi.hoisted(() => ({
	createDeliveryNotePdf: vi.fn(async (_input: DeliveryNoteInput) => new Uint8Array([37, 80, 68, 70])),
	triggerDownload: vi.fn(),
}));

vi.mock('../../engines/delivery-note', async (importOriginal) => {
	const original = await importOriginal<typeof import('../../engines/delivery-note')>();
	return { ...original, createDeliveryNotePdf: (input: DeliveryNoteInput) => createDeliveryNotePdf(input) };
});

vi.mock('../../engines/pdf', () => ({ triggerDownload }));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
	createDeliveryNotePdf.mockClear();
	triggerDownload.mockClear();
	container = document.createElement('div');
	document.body.append(container);
	root = createRoot(container);
	act(() => root.render(<DeliveryNoteGenerator />));
});

afterEach(() => {
	act(() => root.unmount());
	container.remove();
});

describe('DeliveryNoteGenerator', () => {
	it('shows sender, recipient, delivery details, and acknowledgment fields', () => {
		const preview = container.querySelector('.delivery-note-preview');
		expect(preview?.textContent).toContain('DELIVERY NOTE');
		expect(preview?.textContent).toContain('RECIPIENT');
		expect(preview?.textContent).toContain('Delivery acknowledgment');
	});

	it('adds delivery items', () => {
		act(() => Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find((button) => button.textContent?.includes('Add delivery item'))?.click());
		expect(container.querySelectorAll('input[aria-label*="Delivery item"][aria-label*="description"]')).toHaveLength(2);
	});

	it('downloads the delivery note as a PDF', async () => {
		await act(async () => container.querySelector<HTMLButtonElement>('.tool-actions button')?.click());
		expect(createDeliveryNotePdf).toHaveBeenCalledTimes(1);
		expect(triggerDownload).toHaveBeenCalledTimes(1);
		expect(triggerDownload.mock.calls[0]?.[1]).toMatch(/\.pdf$/);
	});
});
