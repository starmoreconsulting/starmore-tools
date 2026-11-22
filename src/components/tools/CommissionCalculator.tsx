import { useState } from 'react';
import { readFiniteNumber } from '../../engines/calculator-format';
import {
	calculateCommission,
	COMMISSION_CALCULATOR_CURRENCIES,
	formatCommissionAmount,
} from '../../engines/commission-calculator';
import type { ExpenseTrackerCurrency } from '../../engines/expense-tracker';

export default function CommissionCalculator() {
	const [salesAmount, setSalesAmount] = useState('');
	const [commissionRate, setCommissionRate] = useState('');
	const [basePay, setBasePay] = useState('');
	const [currency, setCurrency] = useState<ExpenseTrackerCurrency>('NGN');

	const salesValue = readFiniteNumber(salesAmount);
	const rateValue = readFiniteNumber(commissionRate);
	const baseValue = basePay.trim() === '' ? 0 : readFiniteNumber(basePay);
	const complete = salesAmount.trim() !== '' && commissionRate.trim() !== '';
	const hasInvalidNumber = salesValue === null || rateValue === null || baseValue === null;
	let result: ReturnType<typeof calculateCommission> | null = null;
	let errorMessage = 'Enter sales and a commission rate to see your estimate.';

	if (complete && hasInvalidNumber) {
		errorMessage = 'Enter valid numbers for sales, commission rate, and base pay.';
	} else if (complete) {
		try {
			result = calculateCommission({
				salesAmount: salesValue,
				commissionRate: rateValue,
				basePay: baseValue,
				currency,
			});
			errorMessage = 'Estimate uses one flat commission rate applied to total sales.';
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Unable to calculate this commission estimate.';
		}
	}

	return (
		<div>
			<div className="calc-fields">
				<div className="calc-field">
					<label htmlFor="commission-sales">Total sales</label>
					<input id="commission-sales" type="number" min="0" step="any" inputMode="decimal" value={salesAmount} onChange={(event) => setSalesAmount(event.target.value)} placeholder="12,500" />
				</div>
				<div className="calc-field">
					<label htmlFor="commission-rate">Commission rate</label>
					<div className="calc-input-suffix">
						<input id="commission-rate" type="number" min="0" max="100" step="any" inputMode="decimal" value={commissionRate} onChange={(event) => setCommissionRate(event.target.value)} placeholder="7.5" />
						<span>%</span>
					</div>
				</div>
				<div className="calc-field">
					<label htmlFor="commission-base-pay">Base pay (optional)</label>
					<input id="commission-base-pay" type="number" min="0" step="any" inputMode="decimal" value={basePay} onChange={(event) => setBasePay(event.target.value)} placeholder="0" />
				</div>
				<div className="calc-field">
					<label htmlFor="commission-currency">Currency</label>
					<select id="commission-currency" value={currency} onChange={(event) => setCurrency(event.target.value as ExpenseTrackerCurrency)}>
						{COMMISSION_CALCULATOR_CURRENCIES.map((option) => <option key={option} value={option}>{option}</option>)}
					</select>
				</div>
			</div>
			<div className="calc-result-grid three-columns" aria-live="polite">
				<div className="calc-result">
					<span className="calc-label">COMMISSION</span>
					<strong>{result ? formatCommissionAmount(result.commission, currency) : '—'}</strong>
				</div>
				<div className="calc-result">
					<span className="calc-label">BASE PAY</span>
					<strong>{result ? formatCommissionAmount(result.basePay, currency) : '—'}</strong>
				</div>
				<div className="calc-result featured">
					<span className="calc-label">TOTAL EARNINGS</span>
					<strong>{result ? formatCommissionAmount(result.totalEarnings, currency) : '—'}</strong>
				</div>
			</div>
			<p className={`tool-message${complete && result === null ? ' error' : ''}`} role="status">{errorMessage}</p>
			<p className="commission-disclaimer">This estimate applies one flat rate to the sales amount entered. It does not account for tiered rates, quotas, returns, taxes, or other compensation rules.</p>
		</div>
	);
}
