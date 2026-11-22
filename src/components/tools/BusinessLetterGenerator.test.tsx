// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BusinessLetterInput } from '../../engines/business-letter';
import BusinessLetterGenerator from './BusinessLetterGenerator';

const { createBusinessLetterPdf, triggerDownload } = vi.hoisted(() => ({
	createBusinessLetterPdf: vi.fn(async (_input: BusinessLetterInput) => new Uint8Array([37, 80, 68, 70])),
	triggerDownload: vi.fn(),
}));

vi.mock('../../engines/business-letter', async (importOriginal) => {
	const original = await importOriginal<typeof import('../../engines/business-letter')>();
	return { ...original, createBusinessLetterPdf: (input: BusinessLetterInput) => createBusinessLetterPdf(input) };
});

vi.mock('../../engines/pdf', () => ({ triggerDownload }));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let container: HTMLDivElement;
let root: Root;

function setValue(selector: string, value: string) {
	const input = container.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector);
	if (!input) throw new Error(`Missing input ${selector}`);
	const prototype = input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
	Object.getOwnPropertyDescriptor(prototype, 'value')?.set?.call(input, value);
	input.dispatchEvent(new Event('input', { bubbles: true }));
	input.dispatchEvent(new Event('change', { bubbles: true }));
}

beforeEach(() => {
	createBusinessLetterPdf.mockClear();
	triggerDownload.mockClear();
	container = document.createElement('div');
	document.body.append(container);
	root = createRoot(container);
	act(() => root.render(<BusinessLetterGenerator />));
});

afterEach(() => {
	act(() => root.unmount());
	container.remove();
});

describe('BusinessLetterGenerator', () => {
	it('shows sender, recipient, letter body, and live preview', () => {
		expect(container.querySelector('#letter-sender-name')).not.toBeNull();
		expect(container.querySelector('#letter-recipient-name')).not.toBeNull();
		expect(container.querySelector('#letter-body')).not.toBeNull();
		expect(container.querySelector('.business-letter-preview')?.textContent).toContain('Dear Sir or Madam,');
	});

	it('updates the live preview from the letter form', () => {
		act(() => {
			setValue('#letter-sender-name', 'Alex Morgan');
			setValue('#letter-recipient-name', 'Jordan Lee');
			setValue('#letter-subject', 'Project update');
			setValue('#letter-body', 'Thank you for your time.');
			setValue('#letter-signature-name', 'Alex Morgan');
		});
		const preview = container.querySelector('.business-letter-preview');
		expect(preview?.textContent).toContain('Alex Morgan');
		expect(preview?.textContent).toContain('Jordan Lee');
		expect(preview?.textContent).toContain('Subject: Project update');
		expect(preview?.textContent).toContain('Thank you for your time.');
	});

	it('downloads the business letter as a PDF', async () => {
		act(() => {
			setValue('#letter-sender-name', 'Alex Morgan');
			setValue('#letter-recipient-name', 'Jordan Lee');
			setValue('#letter-body', 'Thank you for your time.');
			setValue('#letter-signature-name', 'Alex Morgan');
		});
		await act(async () => container.querySelector<HTMLButtonElement>('.tool-actions button')?.click());
		expect(createBusinessLetterPdf).toHaveBeenCalledTimes(1);
		expect(triggerDownload).toHaveBeenCalledTimes(1);
		expect(triggerDownload.mock.calls[0]?.[1]).toMatch(/\.pdf$/);
	});
});
