// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import SalaryCalculator from './SalaryCalculator';

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
	container = document.createElement('div');
	document.body.append(container);
	root = createRoot(container);
	act(() => root.render(<SalaryCalculator />));
});

afterEach(() => {
	act(() => root.unmount());
	container.remove();
});

describe('SalaryCalculator', () => {
	it('shows salary inputs and prompts for an annual salary', () => {
		expect(container.querySelector('#salary-annual')).not.toBeNull();
		expect(container.querySelector('#salary-frequency')).not.toBeNull();
		expect(container.querySelector('[role="status"]')?.textContent).toContain('Enter your annual gross salary');
	});

	it('updates paycheck and take-home results when values change', () => {
		act(() => {
			setValue('#salary-annual', '52000');
			setValue('#salary-deductions', '20');
			setValue('#salary-frequency', 'biweekly');
		});
		expect(container.querySelector('.salary-result-grid')?.textContent).toContain('NGN 2,000.00');
		expect(container.querySelector('.salary-result-grid')?.textContent).toContain('NGN 1,600.00');
		expect(container.querySelector('.salary-secondary-results')?.textContent).toContain('NGN 3,466.67');
	});

	it('shows validation guidance for out-of-range deductions', () => {
		act(() => {
			setValue('#salary-annual', '52000');
			setValue('#salary-deductions', '101');
		});
		expect(container.querySelector('[role="status"]')?.textContent).toContain('between 0 and 100%');
		expect(container.querySelector('.salary-result-grid')?.textContent).toContain('—');
	});
});
