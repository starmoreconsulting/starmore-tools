// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ProjectBudgetCalculator from './ProjectBudgetCalculator';

const { triggerDownload } = vi.hoisted(() => ({ triggerDownload: vi.fn() }));
vi.mock('../../engines/pdf', () => ({ triggerDownload }));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let container: HTMLDivElement;
let root: Root;

function setValue(selector: string, value: string) {
	const input = container.querySelector<HTMLInputElement | HTMLSelectElement>(selector);
	if (!input) throw new Error(`Missing input ${selector}`);
	const prototype = input instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
	Object.getOwnPropertyDescriptor(prototype, 'value')?.set?.call(input, value);
	input.dispatchEvent(new Event('input', { bubbles: true }));
	input.dispatchEvent(new Event('change', { bubbles: true }));
}

beforeEach(() => {
	triggerDownload.mockClear();
	container = document.createElement('div');
	document.body.append(container);
	root = createRoot(container);
	act(() => root.render(<ProjectBudgetCalculator />));
});

afterEach(() => {
	act(() => root.unmount());
	container.remove();
});

function addItem(description: string, quantity: string, unitCost: string) {
	act(() => {
		setValue('#project-budget-description', description);
		setValue('#project-budget-quantity', quantity);
		setValue('#project-budget-unit-cost', unitCost);
	});
	act(() => container.querySelector<HTMLButtonElement>('[aria-label="Add project budget item"] button')?.click());
}

describe('ProjectBudgetCalculator', () => {
	it('shows project budget settings and an empty item list', () => {
		expect(container.querySelector('#project-budget-currency')).not.toBeNull();
		expect(container.querySelector('#project-budget-contingency')).not.toBeNull();
		expect(container.textContent).toContain('No budget items yet');
	});

	it('adds budget items and calculates total including contingency', () => {
		addItem('Design work', '2', '250');
		expect(container.querySelector('.project-budget-total-cards')?.textContent).toContain('NGN 500.00');
		expect(container.querySelector('.project-budget-total-cards')?.textContent).toContain('NGN 550.00');
		expect(container.querySelector('.project-budget-table')?.textContent).toContain('Design work');
	});

	it('updates the remaining and over-budget amount when the limit changes', () => {
		addItem('Materials', '2', '500');
		act(() => setValue('#project-budget-limit', '1200'));
		expect(container.querySelector('.project-budget-status')?.textContent).toContain('REMAINING BUDGET');
		expect(container.querySelector('.project-budget-status')?.textContent).toContain('NGN 100.00');
		act(() => setValue('#project-budget-limit', '500'));
		expect(container.querySelector('.project-budget-status')?.textContent).toContain('OVER BUDGET');
		expect(container.querySelector('.project-budget-status')?.textContent).toContain('NGN 600.00');
	});

	it('allows editing and deleting budget items', () => {
		addItem('Design work', '2', '250');
		act(() => setValue('[aria-label="Unit cost for Design work"]', '300'));
		expect(container.querySelector('.project-budget-total-cards')?.textContent).toContain('NGN 660.00');
		act(() => container.querySelector<HTMLButtonElement>('.project-budget-table .expense-delete-button')?.click());
		expect(container.querySelector('.project-budget-table')).toBeNull();
	});

	it('exports the budget as a CSV download', () => {
		addItem('Design work', '1', '250');
		act(() => container.querySelector<HTMLButtonElement>('.project-budget-results-header button')?.click());
		expect(triggerDownload).toHaveBeenCalledTimes(1);
		expect(triggerDownload.mock.calls[0]?.[1]).toMatch(/\.csv$/);
	});
});
