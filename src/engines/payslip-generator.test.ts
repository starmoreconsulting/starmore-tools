import { describe, expect, it } from 'vitest';
import {
	calculatePayslipTotals,
	sanitizePayslipText,
	validatePayslipInput,
	type PayslipGeneratorInput,
} from './payslip-generator';

const validInput: PayslipGeneratorInput = {
	employerName: 'Northwind Studio',
	employerDetails: '12 Example Street',
	employeeName: 'Jordan Lee',
	employeeId: 'W-014',
	jobTitle: 'Designer',
	payPeriodStart: '2026-03-01',
	payPeriodEnd: '2026-03-31',
	payDate: '2026-04-01',
	currency: 'USD',
	earnings: [
		{ description: 'Base pay', amount: 1200.25 },
		{ description: 'Allowance', amount: 99.75 },
	],
	deductions: [
		{ description: 'User-entered deduction', amount: 50 },
	],
	notes: '',
};

describe('payslip-generator', () => {
	it('calculates gross pay, deductions, and net pay to cents', () => {
		expect(calculatePayslipTotals(
			[{ description: 'Hourly pay', amount: 100.105 }, { description: 'Bonus', amount: 25 }],
			[{ description: 'Manual deduction', amount: 10.105 }],
		)).toEqual({ grossPay: 125.11, totalDeductions: 10.11, netPay: 115 });
	});

	it('allows no deductions and does not clamp negative net pay', () => {
		expect(calculatePayslipTotals(
			[{ description: 'Pay', amount: 20 }],
			[{ description: 'Manual deduction', amount: 35 }],
		)).toEqual({ grossPay: 20, totalDeductions: 35, netPay: -15 });
		expect(calculatePayslipTotals([{ description: 'Pay', amount: 20 }], []).netPay).toBe(20);
	});

	it('accepts a valid payslip and rejects invalid period order or dates', () => {
		expect(validatePayslipInput(validInput)).toEqual({
			grossPay: 1300,
			totalDeductions: 50,
			netPay: 1250,
		});
		expect(() => validatePayslipInput({ ...validInput, payPeriodStart: '2026-04-01' }))
			.toThrow('Pay period end cannot be earlier than the start.');
		expect(() => validatePayslipInput({ ...validInput, payDate: '2026-02-30' }))
			.toThrow('valid pay date');
	});

	it('rejects missing names, invalid amounts, and unsafe totals', () => {
		expect(() => validatePayslipInput({ ...validInput, employeeName: ' ' })).toThrow('Worker name is required.');
		expect(() => calculatePayslipTotals([{ description: 'Pay', amount: Number.NaN }], [])).toThrow('amount must be zero or more');
		expect(() => calculatePayslipTotals([{ description: 'Pay', amount: Number.MAX_VALUE }], [])).toThrow('too large');
		expect(() => calculatePayslipTotals([{ description: '  ', amount: 10 }], [])).toThrow('description');
	});

	it('removes unsafe control and bidi formatting characters from printable text', () => {
		expect(sanitizePayslipText('Pay\r\n<&> \u0000\u202eOK')).toBe('Pay\n<&> OK');
	});
});
