import { useState } from 'react';
import { readFiniteNumber } from '../../engines/calculator-format';
import {
	calculateSalary,
	formatSalaryAmount,
	SALARY_CALCULATOR_CURRENCIES,
	SALARY_PAY_FREQUENCIES,
	type SalaryCalculatorResult,
	type SalaryPayFrequency,
} from '../../engines/salary-calculator';

const FREQUENCY_LABELS: Record<SalaryPayFrequency, string> = {
	weekly: 'Weekly (52 paychecks)',
	biweekly: 'Every two weeks (26 paychecks)',
	semimonthly: 'Twice a month (24 paychecks)',
	monthly: 'Monthly (12 paychecks)',
};

export default function SalaryCalculator() {
	const [annualSalary, setAnnualSalary] = useState('');
	const [currency, setCurrency] = useState<(typeof SALARY_CALCULATOR_CURRENCIES)[number]>('NGN');
	const [payFrequency, setPayFrequency] = useState<SalaryPayFrequency>('monthly');
	const [deductionRate, setDeductionRate] = useState('0');
	const [hoursPerWeek, setHoursPerWeek] = useState('40');

	const salaryValue = readFiniteNumber(annualSalary);
	const deductionValue = readFiniteNumber(deductionRate);
	const hoursValue = readFiniteNumber(hoursPerWeek);
	const complete = annualSalary.trim() !== '';
	let result: SalaryCalculatorResult | null = null;
	let errorMessage = '';
	if (complete && (salaryValue === null || deductionValue === null || hoursValue === null)) {
		errorMessage = 'Enter valid numbers for salary, deductions, and weekly work hours.';
	} else if (complete) {
		try {
			result = calculateSalary({
			annualSalary: salaryValue,
			currency,
			payFrequency,
			deductionRate: deductionValue,
			hoursPerWeek: hoursValue,
			});
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Unable to calculate this salary estimate.';
		}
	} else {
		errorMessage = 'Enter your annual gross salary to see the estimate.';
	}

	return (
		<div>
			<div className="calc-fields">
				<div className="calc-field">
					<label htmlFor="salary-annual">Annual gross salary</label>
					<input id="salary-annual" type="number" min="0" step="any" inputMode="decimal" value={annualSalary} onChange={(event) => setAnnualSalary(event.target.value)} placeholder="60,000" />
				</div>
				<div className="calc-field">
					<label htmlFor="salary-currency">Currency</label>
					<select id="salary-currency" value={currency} onChange={(event) => setCurrency(event.target.value as typeof currency)}>
						{SALARY_CALCULATOR_CURRENCIES.map((option) => <option key={option} value={option}>{option}</option>)}
					</select>
				</div>
				<div className="calc-field">
					<label htmlFor="salary-frequency">Pay frequency</label>
					<select id="salary-frequency" value={payFrequency} onChange={(event) => setPayFrequency(event.target.value as SalaryPayFrequency)}>
						{SALARY_PAY_FREQUENCIES.map((frequency) => <option key={frequency} value={frequency}>{FREQUENCY_LABELS[frequency]}</option>)}
					</select>
				</div>
				<div className="calc-field">
					<label htmlFor="salary-deductions">Estimated deductions</label>
					<div className="calc-input-suffix">
						<input id="salary-deductions" type="number" min="0" max="100" step="any" inputMode="decimal" value={deductionRate} onChange={(event) => setDeductionRate(event.target.value)} />
						<span>%</span>
					</div>
					<p className="inline-note">Enter an estimated combined rate for tax, benefits, or other deductions.</p>
				</div>
				<div className="calc-field">
					<label htmlFor="salary-hours">Work hours per week</label>
					<div className="calc-input-suffix">
						<input id="salary-hours" type="number" min="0.01" max="168" step="any" inputMode="decimal" value={hoursPerWeek} onChange={(event) => setHoursPerWeek(event.target.value)} />
						<span>hours</span>
					</div>
				</div>
			</div>
			<div className="calc-result-grid salary-result-grid" aria-live="polite">
				<div className="calc-result">
					<span className="calc-label">GROSS PER PAYCHECK</span>
					<strong>{result ? formatSalaryAmount(result.grossPerPaycheck, currency) : '—'}</strong>
				</div>
				<div className="calc-result">
					<span className="calc-label">DEDUCTIONS PER PAYCHECK</span>
					<strong>{result ? formatSalaryAmount(result.deductionsPerPaycheck, currency) : '—'}</strong>
				</div>
				<div className="calc-result featured">
					<span className="calc-label">ESTIMATED TAKE-HOME</span>
					<strong>{result ? formatSalaryAmount(result.netPerPaycheck, currency) : '—'}</strong>
					<small>per paycheck</small>
				</div>
				<div className="calc-result">
					<span className="calc-label">ESTIMATED ANNUAL TAKE-HOME</span>
					<strong>{result ? formatSalaryAmount(result.annualNet, currency) : '—'}</strong>
				</div>
			</div>
			{result && (
				<p className="salary-secondary-results">
					Estimated monthly take-home: <strong>{formatSalaryAmount(result.monthlyNet, currency)}</strong>
					<span aria-hidden="true"> · </span>
					Gross hourly equivalent: <strong>{formatSalaryAmount(result.hourlyEquivalent, currency)}</strong>
				</p>
			)}
			<p className={`tool-message${complete && result === null ? ' error' : ''}`} role="status">
				{errorMessage}
			</p>
			<p className="salary-disclaimer">This is a planning estimate, not a payroll or tax calculation. Deduction rates vary by location and personal circumstances; confirm actual pay with your employer or a qualified professional.</p>
		</div>
	);
}
