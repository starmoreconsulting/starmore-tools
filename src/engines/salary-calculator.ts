import { EXPENSE_TRACKER_CURRENCIES, isOneOf, type ExpenseTrackerCurrency } from './expense-tracker';

export const SALARY_CALCULATOR_CURRENCIES = EXPENSE_TRACKER_CURRENCIES;
export const SALARY_PAY_FREQUENCIES = ['weekly', 'biweekly', 'semimonthly', 'monthly'] as const;

export type SalaryPayFrequency = (typeof SALARY_PAY_FREQUENCIES)[number];

export interface SalaryCalculatorInput {
	annualSalary: number;
	currency: ExpenseTrackerCurrency;
	payFrequency: SalaryPayFrequency;
	deductionRate: number;
	hoursPerWeek: number;
}

export interface SalaryCalculatorResult {
	paychecksPerYear: number;
	annualGross: number;
	annualDeductions: number;
	annualNet: number;
	grossPerPaycheck: number;
	deductionsPerPaycheck: number;
	netPerPaycheck: number;
	monthlyNet: number;
	hourlyEquivalent: number;
}

const PAYCHECKS_PER_YEAR: Record<SalaryPayFrequency, number> = {
	weekly: 52,
	biweekly: 26,
	semimonthly: 24,
	monthly: 12,
};

function roundToCents(amount: number): number {
	return Math.round(amount * 100) / 100;
}

export function calculateSalary(input: SalaryCalculatorInput): SalaryCalculatorResult {
	if (!Number.isFinite(input.annualSalary) || input.annualSalary < 0
		|| !Number.isSafeInteger(Math.round(input.annualSalary * 100))) {
		throw new Error('Enter a non-negative annual salary within the supported amount.');
	}
	if (!isOneOf(input.currency, SALARY_CALCULATOR_CURRENCIES)) throw new Error('Choose a supported currency.');
	if (!isOneOf(input.payFrequency, SALARY_PAY_FREQUENCIES)) throw new Error('Choose a valid pay frequency.');
	if (!Number.isFinite(input.deductionRate) || input.deductionRate < 0 || input.deductionRate > 100) {
		throw new Error('Estimated deductions must be between 0 and 100%.');
	}
	if (!Number.isFinite(input.hoursPerWeek) || input.hoursPerWeek <= 0 || input.hoursPerWeek > 168) {
		throw new Error('Weekly work hours must be greater than zero and no more than 168.');
	}

	const annualGrossCents = Math.round(input.annualSalary * 100);
	const annualDeductionsCents = Math.round(annualGrossCents * input.deductionRate / 100);
	const annualNetCents = annualGrossCents - annualDeductionsCents;
	const paychecksPerYear = PAYCHECKS_PER_YEAR[input.payFrequency];
	const grossPerPaycheckCents = Math.round(annualGrossCents / paychecksPerYear);
	const netPerPaycheckCents = Math.round(annualNetCents / paychecksPerYear);
	const deductionsPerPaycheckCents = grossPerPaycheckCents - netPerPaycheckCents;

	return {
		paychecksPerYear,
		annualGross: annualGrossCents / 100,
		annualDeductions: annualDeductionsCents / 100,
		annualNet: annualNetCents / 100,
		grossPerPaycheck: grossPerPaycheckCents / 100,
		deductionsPerPaycheck: deductionsPerPaycheckCents / 100,
		netPerPaycheck: netPerPaycheckCents / 100,
		monthlyNet: roundToCents(annualNetCents / 12 / 100),
		hourlyEquivalent: roundToCents(annualGrossCents / 100 / (52 * input.hoursPerWeek)),
	};
}

export function formatSalaryAmount(amount: number, currency: string): string {
	if (!Number.isFinite(amount)) throw new Error('Enter a valid salary amount.');
	return `${currency} ${new Intl.NumberFormat('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)}`;
}
