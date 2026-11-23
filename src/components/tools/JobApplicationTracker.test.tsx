// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { JOB_APPLICATION_TRACKER_STORAGE_KEY } from '../../engines/job-application-tracker';
import JobApplicationTracker from './JobApplicationTracker';

const { triggerDownload } = vi.hoisted(() => ({ triggerDownload: vi.fn() }));
vi.mock('../../engines/pdf', () => ({ triggerDownload }));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let container: HTMLDivElement;
let root: Root;

async function renderTracker() {
	container = document.createElement('div');
	document.body.append(container);
	root = createRoot(container);
	await act(async () => { root.render(<JobApplicationTracker />); });
}

async function setValue(selector: string, value: string) {
	await act(async () => {
		const input = container.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(selector);
		if (!input) throw new Error(`Missing input ${selector}`);
		const prototype = input instanceof HTMLSelectElement ? HTMLSelectElement.prototype
			: input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
		Object.getOwnPropertyDescriptor(prototype, 'value')?.set?.call(input, value);
		input.dispatchEvent(new Event('input', { bubbles: true }));
		input.dispatchEvent(new Event('change', { bubbles: true }));
	});
}

async function submitForm() {
	await act(async () => {
		const form = container.querySelector('form');
		if (!form) throw new Error('Missing application form');
		form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
	});
}

async function addApplication(company = 'Northstar', role = 'Product Designer') {
	await setValue('#job-company', company);
	await setValue('#job-role', role);
	await setValue('#job-applied-date', '2026-03-10');
	await setValue('#job-follow-up', '2026-03-20');
	await submitForm();
}

beforeEach(() => {
	localStorage.clear();
	triggerDownload.mockClear();
});

afterEach(() => {
	if (root) act(() => root.unmount());
	container?.remove();
	localStorage.clear();
});

describe('JobApplicationTracker', () => {
	it('adds and persists a private application record', async () => {
		await renderTracker();
		await addApplication();
		expect(container.textContent).toContain('Northstar');
		expect(container.textContent).toContain('Product Designer');
		const saved = JSON.parse(localStorage.getItem(JOB_APPLICATION_TRACKER_STORAGE_KEY) || '{}');
		expect(saved.version).toBe(1);
		expect(saved.applications).toHaveLength(1);
	});

	it('edits and deletes an application', async () => {
		await renderTracker();
		await addApplication();
		await act(async () => container.querySelector<HTMLButtonElement>('button[aria-label^="Edit"]')?.click());
		await setValue('#job-role', 'Senior Designer');
		await submitForm();
		expect(container.textContent).toContain('Senior Designer');
		await act(async () => container.querySelector<HTMLButtonElement>('button[aria-label^="Delete"]')?.click());
		expect(container.textContent).toContain('No applications yet');
		expect(JSON.parse(localStorage.getItem(JOB_APPLICATION_TRACKER_STORAGE_KEY) || '{}').applications).toEqual([]);
	});

	it('filters by status and exports a JSON backup', async () => {
		await renderTracker();
		await addApplication();
		await act(async () => container.querySelector<HTMLButtonElement>('button[aria-label^="Edit"]')?.click());
		await setValue('#job-status', 'Interview');
		await submitForm();
		await setValue('#job-filter-status', 'Applied');
		expect(container.textContent).toContain('No applications match these filters');
		await setValue('#job-filter-status', 'Interview');
		expect(container.textContent).toContain('Northstar');
		await act(async () => container.querySelector<HTMLButtonElement>('.expense-ledger-actions button')?.click());
		expect(triggerDownload).toHaveBeenCalledTimes(1);
		expect(triggerDownload.mock.calls[0]?.[1]).toMatch(/\.json$/);
	});

	it('reports malformed saved data without overwriting it', async () => {
		localStorage.setItem(JOB_APPLICATION_TRACKER_STORAGE_KEY, '{broken');
		await renderTracker();
		expect(container.textContent).toContain('not valid JSON');
		expect(localStorage.getItem(JOB_APPLICATION_TRACKER_STORAGE_KEY)).toBe('{broken');
	});

	it('requires confirmation before clearing all applications', async () => {
		await renderTracker();
		await addApplication();
		const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
		const clearButton = () => [...container.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent === 'Clear all');
		await act(async () => clearButton()?.click());
		expect(container.textContent).toContain('Northstar');
		confirm.mockReturnValue(true);
		await act(async () => clearButton()?.click());
		expect(container.textContent).toContain('No applications yet');
		confirm.mockRestore();
	});
});
