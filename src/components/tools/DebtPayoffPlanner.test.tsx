// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import DebtPayoffPlanner from './DebtPayoffPlanner';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let container: HTMLDivElement;
let root: Root;

function setValue(selector: string, value: string) {
	const input = container.querySelector<HTMLInputElement>(selector);
	if (!input) throw new Error(`Missing input ${selector}`);
	Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, value);
	input.dispatchEvent(new Event('input', { bubbles: true }));
	input.dispatchEvent(new Event('change', { bubbles: true }));
}

function addDebt(name: string, balance: string, apr: string, minimum: string) {
	act(() => {
		setValue('#debt-payoff-name', name);
		setValue('#debt-payoff-balance', balance);
		setValue('#debt-payoff-apr', apr);
		setValue('#debt-payoff-minimum', minimum);
		container.querySelector<HTMLButtonElement>('.debt-payoff-planner > section:first-child button')?.click();
	});
}

beforeEach(() => {
	container = document.createElement('div');
	document.body.append(container);
	root = createRoot(container);
	act(() => root.render(<DebtPayoffPlanner />));
});

afterEach(() => {
	act(() => root.unmount());
	container.remove();
});

describe('DebtPayoffPlanner', () => {
	it('adds debts and displays both payoff approaches and their estimate assumptions', () => {
		addDebt('Credit card', '1000', '12', '100');
		addDebt('Personal loan', '500', '0', '50');
		expect(container.textContent).toContain('Snowball');
		expect(container.textContent).toContain('Avalanche');
		expect(container.textContent).toContain('Credit card');
		expect(container.textContent).toContain('monthly compounding');
		expect(container.textContent).toContain('Payoff schedule');
	});

	it('reports invalid minimum payments and warns when minimums do not cover interest', () => {
		addDebt('Invalid debt', '1000', '12', '0');
		expect(container.textContent).toContain('minimum monthly payment must be greater than zero');
		addDebt('Growing card', '1000', '12', '10');
		expect(container.textContent).toContain('Minimum-payment warning');
		expect(container.textContent).toContain('Not projected to be fully paid off');
		expect(container.textContent).toContain('TOTAL INTEREST');
	});

	it('lets the user add an extra payment and remove a debt', () => {
		addDebt('Card', '1000', '12', '10');
		act(() => setValue('#debt-payoff-extra', '20'));
		expect(container.textContent).toContain('Estimated payoff in');
		act(() => container.querySelector<HTMLButtonElement>('[aria-label="Remove Card"]')?.click());
		expect(container.textContent).toContain('No debts added yet.');
	});
});
