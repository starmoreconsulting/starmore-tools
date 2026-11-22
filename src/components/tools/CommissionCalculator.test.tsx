// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import CommissionCalculator from './CommissionCalculator';

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
	act(() => root.render(<CommissionCalculator />));
});

afterEach(() => {
	act(() => root.unmount());
	container.remove();
});

describe('CommissionCalculator', () => {
	it('shows commission inputs and an empty estimate', () => {
		expect(container.querySelector('#commission-sales')).not.toBeNull();
		expect(container.querySelector('#commission-rate')).not.toBeNull();
		expect(container.querySelector('.calc-result-grid')?.textContent).toContain('—');
	});

	it('calculates commission and total earnings as inputs change', () => {
		act(() => {
			setValue('#commission-sales', '12500');
			setValue('#commission-rate', '7.5');
			setValue('#commission-base-pay', '1500');
		});
		const results = container.querySelector('.calc-result-grid')?.textContent ?? '';
		expect(results).toContain('NGN 937.50');
		expect(results).toContain('NGN 1,500.00');
		expect(results).toContain('NGN 2,437.50');
	});

	it('shows validation guidance for an invalid commission rate', () => {
		act(() => {
			setValue('#commission-sales', '12500');
			setValue('#commission-rate', '101');
		});
		expect(container.querySelector('[role="status"]')?.textContent).toContain('between 0 and 100%');
		expect(container.querySelector('.calc-result-grid')?.textContent).toContain('—');
	});
});
