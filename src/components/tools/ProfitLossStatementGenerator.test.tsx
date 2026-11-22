// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProfitLossStatementInput } from '../../engines/profit-loss-statement';
import ProfitLossStatementGenerator from './ProfitLossStatementGenerator';

const { createProfitLossStatementPdf, triggerDownload } = vi.hoisted(() => ({
	createProfitLossStatementPdf: vi.fn(async (_input: ProfitLossStatementInput) => new Uint8Array([37, 80, 68, 70])),
	triggerDownload: vi.fn(),
}));

vi.mock('../../engines/profit-loss-statement', async (importOriginal) => {
	const original = await importOriginal<typeof import('../../engines/profit-loss-statement')>();
	return { ...original, createProfitLossStatementPdf: (input: ProfitLossStatementInput) => createProfitLossStatementPdf(input) };
});

vi.mock('../../engines/pdf', () => ({ triggerDownload }));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let container: HTMLDivElement;
let root: Root;

function setValue(selector: string, value: string) {
	const input = container.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(selector);
	if (!input) throw new Error(`Missing input ${selector}`);
	const prototype = input instanceof HTMLSelectElement ? HTMLSelectElement.prototype
		: input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
	Object.getOwnPropertyDescriptor(prototype, 'value')?.set?.call(input, value);
	input.dispatchEvent(new Event('input', { bubbles: true }));
	input.dispatchEvent(new Event('change', { bubbles: true }));
}

beforeEach(() => {
	createProfitLossStatementPdf.mockClear();
	triggerDownload.mockClear();
	container = document.createElement('div');
	document.body.append(container);
	root = createRoot(container);
	act(() => root.render(<ProfitLossStatementGenerator />));
});

afterEach(() => {
	act(() => root.unmount());
	container.remove();
});

describe('ProfitLossStatementGenerator', () => {
	it('shows statement details, income and expense sections, and an empty preview', () => {
		expect(container.querySelector('#statement-business')).not.toBeNull();
		expect(container.querySelector('[aria-label="Add income"]')).not.toBeNull();
		expect(container.querySelector('[aria-label="Add expense"]')).not.toBeNull();
		expect(container.querySelector('.statement-preview')?.textContent).toContain('No income lines added');
	});

	it('adds income and expense lines and updates the statement totals', () => {
		act(() => {
			setValue('#statement-business', 'Starmore Studio');
			setValue('#statement-income-description', 'Design services');
			setValue('#statement-income-amount', '1000');
		});
		act(() => container.querySelector<HTMLButtonElement>('[aria-label="Add income"] button')?.click());
		act(() => {
			setValue('#statement-expense-description', 'Software');
			setValue('#statement-expense-amount', '250');
		});
		act(() => container.querySelector<HTMLButtonElement>('[aria-label="Add expense"] button')?.click());
		expect(container.querySelector('.statement-preview')?.textContent).toContain('NGN 1,000.00');
		expect(container.querySelector('.statement-preview')?.textContent).toContain('NGN 250.00');
		expect(container.querySelector('.statement-net-result')?.textContent).toContain('NGN 750.00');
	});

	it('removes a statement line', () => {
		act(() => {
			setValue('#statement-business', 'Starmore Studio');
			setValue('#statement-income-description', 'Design services');
			setValue('#statement-income-amount', '1000');
		});
		act(() => container.querySelector<HTMLButtonElement>('[aria-label="Add income"] button')?.click());
		act(() => container.querySelector<HTMLButtonElement>('.statement-line-table-section .expense-delete-button')?.click());
		expect(container.querySelector('.statement-preview')?.textContent).toContain('No income lines added');
	});

	it('downloads the statement PDF', async () => {
		act(() => {
			setValue('#statement-business', 'Starmore Studio');
			setValue('#statement-income-description', 'Design services');
			setValue('#statement-income-amount', '1000');
		});
		act(() => container.querySelector<HTMLButtonElement>('[aria-label="Add income"] button')?.click());
		await act(async () => container.querySelector<HTMLButtonElement>('.tool-actions button')?.click());
		expect(createProfitLossStatementPdf).toHaveBeenCalledTimes(1);
		expect(triggerDownload).toHaveBeenCalledTimes(1);
		expect(triggerDownload.mock.calls[0]?.[1]).toMatch(/\.pdf$/);
	});
});
