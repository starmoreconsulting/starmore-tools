import { useState } from 'react';
import { formatAmount, formatValue, readFiniteNumber } from '../../engines/calculator-format';
import { calculateProfitLoss } from '../../engines/calculators/profit-loss-calculator';

export default function ProfitLossCalculator() {
	const [revenue, setRevenue] = useState('');
	const [expenses, setExpenses] = useState('');
	const revenueValue = readFiniteNumber(revenue);
	const expensesValue = readFiniteNumber(expenses);
	const complete = revenue.trim() !== '' && expenses.trim() !== '';
	const valid = complete && revenueValue !== null && expensesValue !== null && revenueValue >= 0 && expensesValue >= 0;

	let result = null;
	let error = '';
	if (valid) {
		try {
			result = calculateProfitLoss(revenueValue!, expensesValue!);
		} catch (cause) {
			error = cause instanceof Error ? cause.message : 'Unable to calculate this result.';
		}
	}

	const profitLabel = result ? result.profit >= 0 ? 'NET PROFIT' : 'NET LOSS' : 'NET PROFIT / LOSS';

	return (
		<div>
			<div className="calc-fields">
				<div className="calc-field">
					<label htmlFor="profit-loss-revenue">Revenue</label>
					<input id="profit-loss-revenue" type="number" min="0" step="any" inputMode="decimal" value={revenue} onChange={(event) => setRevenue(event.target.value)} placeholder="1000.00" />
				</div>
				<div className="calc-field">
					<label htmlFor="profit-loss-expenses">Expenses</label>
					<input id="profit-loss-expenses" type="number" min="0" step="any" inputMode="decimal" value={expenses} onChange={(event) => setExpenses(event.target.value)} placeholder="650.00" />
				</div>
			</div>
			<div className="calc-result-grid three-columns" aria-live="polite">
				<div className="calc-result featured">
					<span className="calc-label">{profitLabel}</span>
					<strong>{!result ? '—' : formatAmount(Math.abs(result.profit))}</strong>
				</div>
				<div className="calc-result">
					<span className="calc-label">PROFIT / LOSS MARGIN</span>
					<strong>{!result || result.margin === null ? '—' : `${formatValue(result.margin)}%`}</strong>
					{result && result.margin === null && <small>Unavailable when revenue is zero.</small>}
				</div>
				<div className="calc-result">
					<span className="calc-label">EXPENSE RATIO</span>
					<strong>{!result || result.expenseRatio === null ? '—' : `${formatValue(result.expenseRatio)}%`}</strong>
					{result && result.expenseRatio === null && <small>Unavailable when revenue is zero.</small>}
				</div>
			</div>
			<p className={`tool-message${complete && (!valid || error) ? ' error' : ''}`} role="status">
				{error || (complete && !valid ? 'Enter valid non-negative revenue and expense values.' : result ? 'Profit is revenue minus expenses. A negative result is a loss.' : 'Enter revenue and expenses to calculate profit or loss.')}
			</p>
		</div>
	);
}
