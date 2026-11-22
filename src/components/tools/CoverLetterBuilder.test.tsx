// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CoverLetterBuilder from './CoverLetterBuilder';

const { triggerDownload } = vi.hoisted(() => ({ triggerDownload: vi.fn() }));
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
	triggerDownload.mockClear();
	container = document.createElement('div');
	document.body.append(container);
	root = createRoot(container);
	act(() => root.render(<CoverLetterBuilder />));
});

afterEach(() => {
	act(() => root.unmount());
	container.remove();
});

describe('CoverLetterBuilder', () => {
	it('shows sender details and a letter preview', () => {
		expect(container.querySelector('#cover-sender-name')).not.toBeNull();
		expect(container.querySelector('#cover-opening')).not.toBeNull();
		expect(container.querySelector('.cover-letter-preview')?.textContent).toContain('Your name');
	});

	it('updates the live preview from the form fields', () => {
		act(() => {
			setValue('#cover-sender-name', 'Jordan Lee');
			setValue('#cover-job-title', 'Product Designer');
			setValue('#cover-opening', 'I am applying for this role.');
			setValue('#cover-closing', 'Thank you for your consideration.');
		});
		const preview = container.querySelector('.cover-letter-preview')?.textContent ?? '';
		expect(preview).toContain('Jordan Lee');
		expect(preview).toContain('Product Designer');
		expect(preview).toContain('I am applying for this role.');
		expect(preview).toContain('Thank you for your consideration.');
	});

	it('downloads the cover letter as a PDF', async () => {
		act(() => {
			setValue('#cover-sender-name', 'Jordan Lee');
			setValue('#cover-opening', 'I am applying for this role.');
			setValue('#cover-closing', 'Thank you for your consideration.');
		});
		await act(async () => container.querySelector<HTMLButtonElement>('.tool-actions button')?.click());
		expect(triggerDownload).toHaveBeenCalledTimes(1);
		expect(triggerDownload.mock.calls[0]?.[0]).toBeInstanceOf(Blob);
		expect(triggerDownload.mock.calls[0]?.[1]).toBe('Jordan-Lee.pdf');
	});
});
