// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ResumeBuilder from './ResumeBuilder';

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
	act(() => root.render(<ResumeBuilder />));
});

afterEach(() => {
	act(() => root.unmount());
	container.remove();
});

describe('ResumeBuilder', () => {
	it('shows contact fields and a live resume preview', () => {
		expect(container.querySelector('#resume-name')).not.toBeNull();
		expect(container.querySelector('.resume-preview')?.textContent).toContain('Your Name');
	});

	it('updates contact details and preview', () => {
		act(() => {
			setValue('#resume-name', 'Jordan Lee');
			setValue('#resume-title', 'Product Designer');
			setValue('#resume-summary', 'Designing accessible digital products.');
		});
		expect(container.querySelector('.resume-preview')?.textContent).toContain('Jordan Lee');
		expect(container.querySelector('.resume-preview')?.textContent).toContain('Product Designer');
		expect(container.querySelector('.resume-preview')?.textContent).toContain('Designing accessible digital products.');
	});

	it('adds work history and education to the editor and preview', () => {
		act(() => container.querySelector<HTMLButtonElement>('.resume-form-section .tool-button')?.click());
		act(() => {
			setValue('#resume-job-0', 'Designer');
			setValue('#resume-company-0', 'Northstar');
			setValue('#resume-exp-start-0', '2022-01');
			setValue('#resume-exp-end-0', 'Present');
		});
		expect(container.querySelector('.resume-preview')?.textContent).toContain('Designer · Northstar');
		act(() => container.querySelectorAll<HTMLButtonElement>('.resume-form-section .tool-button')[1]?.click());
		act(() => {
			setValue('#resume-qualification-0', 'Bachelor of Design');
			setValue('#resume-institution-0', 'Example University');
			setValue('#resume-edu-start-0', '2018-09');
		});
		expect(container.querySelector('.resume-preview')?.textContent).toContain('Bachelor of Design · Example University');
	});

	it('downloads the resume as a PDF', async () => {
		act(() => setValue('#resume-name', 'Jordan Lee'));
		await act(async () => container.querySelector<HTMLButtonElement>('.tool-actions button')?.click());
		expect(triggerDownload).toHaveBeenCalledTimes(1);
		expect(triggerDownload.mock.calls[0]?.[0]).toBeInstanceOf(Blob);
		expect(triggerDownload.mock.calls[0]?.[1]).toBe('Jordan-Lee.pdf');
	});
});
