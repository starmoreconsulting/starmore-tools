// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PayslipGenerator from './PayslipGenerator';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
	container = document.createElement('div');
	document.body.append(container);
	root = createRoot(container);
	act(() => root.render(<PayslipGenerator />));
});

afterEach(() => {
	act(() => root.unmount());
	container.remove();
});

describe('PayslipGenerator', () => {
	it('shows separate earnings and deductions and the live totals', () => {
		expect(container.querySelector('.payslip-preview')?.textContent).toContain('PAYSLIP');
		expect(container.querySelector('label[for="payslip-period-start"]')?.textContent).toBe('Pay period start');
		expect(container.querySelector('.payslip-summary')?.textContent).toContain('NGN 0.00');
		expect(container.textContent).toContain('does not calculate tax');
	});

	it('escapes user-entered markup as text in the preview', () => {
		const employer = container.querySelector<HTMLInputElement>('#payslip-employer');
		if (!employer) throw new Error('Employer input not found.');
		act(() => {
			const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
			setter?.call(employer, '<img src=x onerror=alert(1)>');
			employer.dispatchEvent(new Event('input', { bubbles: true }));
			employer.dispatchEvent(new Event('change', { bubbles: true }));
		});
		expect(container.querySelector('.payslip-preview img')).toBeNull();
		expect(container.querySelector('.payslip-header')?.textContent).toContain('<img src=x onerror=alert(1)>');
	});

	it('does not print an incomplete payslip and opens print for valid details', () => {
		const print = vi.spyOn(window, 'print').mockImplementation(() => undefined);
		const printButton = container.querySelector<HTMLButtonElement>('.payslip-actions button');
		expect(printButton?.disabled).toBe(true);

		const update = (selector: string, value: string) => {
			const input = container.querySelector<HTMLInputElement>(selector);
			if (!input) throw new Error(`Input not found: ${selector}`);
			const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
			setter?.call(input, value);
			input.dispatchEvent(new Event('input', { bubbles: true }));
			input.dispatchEvent(new Event('change', { bubbles: true }));
		};
		act(() => {
			update('#payslip-employer', 'Northwind Studio');
			update('#payslip-worker', 'Jordan Lee');
		});
		expect(printButton?.disabled).toBe(false);
		act(() => printButton?.click());
		expect(print).toHaveBeenCalledTimes(1);
		print.mockRestore();
	});
});
