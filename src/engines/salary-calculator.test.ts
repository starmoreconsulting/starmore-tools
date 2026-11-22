import { describe, expect, it } from 'vitest';
import { calculateSalary, formatSalaryAmount, type SalaryCalculatorInput } from './salary-calculator';

const salary: SalaryCalculatorInput = {
	annualSalary: 52000,
	currency: 'USD',
	payFrequency: 'biweekly',
	deductionRate: 20,
	hoursPerWeek: 40,
};

describe('salary calculator', () => {
	it('calculates gross, estimated deductions, take-home pay, and hourly equivalent', () => {
		expect(calculateSalary(salary)).toEqual({
			paychecksPerYear: 26,
			annualGross: 52000,
			annualDeductions: 10400,
			annualNet: 41600,
			grossPerPaycheck: 2000,
			deductionsPerPaycheck: 400,
			netPerPaycheck: 1600,
			monthlyNet: 3466.67,
			hourlyEquivalent: 25,
		});
	});

	it('supports each common pay schedule and zero deductions', () => {
		expect(calculateSalary({ ...salary, payFrequency: 'weekly', deductionRate: 0 }).grossPerPaycheck).toBe(1000);
		expect(calculateSalary({ ...salary, payFrequency: 'semimonthly' }).grossPerPaycheck).toBe(2166.67);
		expect(calculateSalary({ ...salary, payFrequency: 'monthly' }).netPerPaycheck).toBe(3466.67);
	});

	it('allows zero salary and full deductions', () => {
		expect(calculateSalary({ ...salary, annualSalary: 0 }).annualNet).toBe(0);
		expect(calculateSalary({ ...salary, deductionRate: 100 }).netPerPaycheck).toBe(0);
	});

	it('rejects invalid salary, pay frequency, deduction rate, hours, and currency', () => {
		expect(() => calculateSalary({ ...salary, annualSalary: -1 })).toThrow('non-negative annual salary');
		expect(() => calculateSalary({ ...salary, annualSalary: Number.MAX_VALUE })).toThrow('supported amount');
		expect(() => calculateSalary({ ...salary, payFrequency: 'daily' as SalaryCalculatorInput['payFrequency'] })).toThrow('valid pay frequency');
		expect(() => calculateSalary({ ...salary, deductionRate: 101 })).toThrow('between 0 and 100%');
		expect(() => calculateSalary({ ...salary, hoursPerWeek: 0 })).toThrow('Weekly work hours');
		expect(() => calculateSalary({ ...salary, hoursPerWeek: 169 })).toThrow('Weekly work hours');
		expect(() => calculateSalary({ ...salary, currency: 'XXX' as SalaryCalculatorInput['currency'] })).toThrow('supported currency');
	});

	it('formats amounts with an explicit currency', () => {
		expect(formatSalaryAmount(1234.5, 'NGN')).toBe('NGN 1,234.50');
		expect(() => formatSalaryAmount(Number.NaN, 'USD')).toThrow('valid salary amount');
	});
});
