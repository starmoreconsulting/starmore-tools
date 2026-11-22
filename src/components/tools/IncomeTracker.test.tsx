// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { INCOME_TRACKER_STORAGE_KEY } from '../../engines/income-tracker';
import IncomeTracker from './IncomeTracker';

const { triggerDownload } = vi.hoisted(() => ({ triggerDownload: vi.fn() }));
vi.mock('../../engines/pdf', () => ({ triggerDownload }));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let container: HTMLDivElement;
let root: Root;

async function renderTracker() {
	container = document.createElement('div');
	document.body.append(container);
	root = createRoot(container);
	await act(async () => { root.render(<IncomeTracker />); });
}

async function enterIncome() {
	await act(async () => {
		const setInputValue = (selector: string, value: string) => {
			const input = container.querySelector<HTMLInputElement | HTMLSelectElement>(selector);
			if (!input) throw new Error(`Missing input ${selector}`);
			const prototype = input instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
			Object.getOwnPropertyDescriptor(prototype, 'value')?.set?.call(input, value);
			input.dispatchEvent(new Event('input', { bubbles: true }));
			input.dispatchEvent(new Event('change', { bubbles: true }));
		};
		setInputValue('#income-description', 'Website project');
		setInputValue('#income-amount', '245.50');
		setInputValue('#income-source', 'Example Client');
	});
	await act(async () => {
		const form = container.querySelector('form');
		if (!form) throw new Error('Missing income form');
		form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
	});
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

describe('IncomeTracker', () => {
	it('shows an income entry form and monthly ledger', async () => {
		await renderTracker();
		expect(container.querySelector('#income-description')).not.toBeNull();
		expect(container.querySelector('.expense-ledger')).not.toBeNull();
		expect(container.textContent).toContain('No income yet');
	});

	it('adds income, shows its monthly total, and saves it locally', async () => {
		await renderTracker();
		await enterIncome();
		expect(container.querySelector('.income-table')?.textContent).toContain('Website project');
		expect(container.querySelector('.expense-total-cards')?.textContent).toContain('NGN 245.50');
		expect(JSON.parse(localStorage.getItem(INCOME_TRACKER_STORAGE_KEY) || '[]')).toHaveLength(1);
	});

	it('filters the ledger by month and deletes an entry', async () => {
		await renderTracker();
		await enterIncome();
		const currentMonth = container.querySelector<HTMLInputElement>('#income-month')?.value;
		if (!currentMonth) throw new Error('Missing default month');
		const [year, monthNumber] = currentMonth.split('-').map(Number);
		const previousMonthDate = new Date(year, monthNumber - 2, 1);
		const previousMonth = `${previousMonthDate.getFullYear()}-${String(previousMonthDate.getMonth() + 1).padStart(2, '0')}`;
		await act(async () => {
			const month = container.querySelector<HTMLInputElement>('#income-month');
			if (!month) throw new Error('Missing month filter');
			const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
			setter?.call(month, previousMonth);
			month.dispatchEvent(new Event('input', { bubbles: true }));
			month.dispatchEvent(new Event('change', { bubbles: true }));
		});
		expect(container.textContent).toContain('No income recorded for this month');
		await act(async () => {
			const month = container.querySelector<HTMLInputElement>('#income-month');
			const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
			setter?.call(month, currentMonth);
			month?.dispatchEvent(new Event('input', { bubbles: true }));
			month?.dispatchEvent(new Event('change', { bubbles: true }));
		});
		await act(async () => container.querySelector<HTMLButtonElement>('.expense-delete-button')?.click());
		expect(container.querySelector('.income-table')).toBeNull();
	});

	it('exports the full income ledger as CSV', async () => {
		await renderTracker();
		await enterIncome();
		await act(async () => container.querySelector<HTMLButtonElement>('.expense-ledger-actions button')?.click());
		expect(triggerDownload).toHaveBeenCalledTimes(1);
		expect(triggerDownload.mock.calls[0]?.[1]).toMatch(/\.csv$/);
	});

	it('reports malformed saved browser data without overwriting it', async () => {
		localStorage.setItem(INCOME_TRACKER_STORAGE_KEY, '{not json');
		await renderTracker();
		expect(container.textContent).toContain('Could not read saved income');
		expect(localStorage.getItem(INCOME_TRACKER_STORAGE_KEY)).toBe('{not json');
	});
});
