import { useState } from 'react';
import { CURRENCY_RATES, CURRENCY_RATE_DATE, convertCurrency } from '../../engines/calculators/currency-converter';
import { formatAmount, readFiniteNumber } from '../../engines/calculator-format';

const currencyNames: Record<string, string> = {
	USD: 'US Dollar', EUR: 'Euro', GBP: 'British Pound', NGN: 'Nigerian Naira', JPY: 'Japanese Yen',
	CAD: 'Canadian Dollar', AUD: 'Australian Dollar', CNY: 'Chinese Yuan', INR: 'Indian Rupee', ZAR: 'South African Rand',
	GHS: 'Ghanaian Cedi', KES: 'Kenyan Shilling', AED: 'UAE Dirham', SAR: 'Saudi Riyal',
};

export default function CurrencyConverter() {
	const [amount, setAmount] = useState('');
	const [from, setFrom] = useState('USD');
	const [to, setTo] = useState('NGN');
	const amountValue = readFiniteNumber(amount);
	const complete = amount.trim() !== '';
	const valid = complete && amountValue !== null && amountValue >= 0;
	let result: number | null = null;
	let error = '';
	if (valid) {
		try { result = convertCurrency(amountValue!, from, to); } catch (cause) { error = cause instanceof Error ? cause.message : 'Unable to convert this amount.'; }
	}

	return (
		<div>
			<div className="calc-fields">
				<div className="calc-field">
					<label htmlFor="currency-amount">Amount</label>
					<input id="currency-amount" type="number" min="0" step="any" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="100.00" />
				</div>
				<div className="calc-field">
					<label htmlFor="currency-from">From</label>
					<select id="currency-from" value={from} onChange={(event) => setFrom(event.target.value)}>
						{Object.keys(CURRENCY_RATES).map((code) => <option key={code} value={code}>{code} — {currencyNames[code]}</option>)}
					</select>
				</div>
				<div className="calc-field">
					<label htmlFor="currency-to">To</label>
					<select id="currency-to" value={to} onChange={(event) => setTo(event.target.value)}>
						{Object.keys(CURRENCY_RATES).map((code) => <option key={code} value={code}>{code} — {currencyNames[code]}</option>)}
					</select>
				</div>
			</div>
			<div className="calc-result-grid" aria-live="polite">
				<div className="calc-result featured">
					<span className="calc-label">CONVERTED AMOUNT</span>
					<strong>{result === null ? '—' : `${formatAmount(result)} ${to}`}</strong>
				</div>
				<div className="calc-result">
					<span className="calc-label">REFERENCE RATE</span>
					<strong>{result === null ? '—' : `1 ${from} = ${formatAmount(convertCurrency(1, from, to))} ${to}`}</strong>
				</div>
			</div>
			<p className={`tool-message${complete && (!valid || error) ? ' error' : ''}`} role="status">
				{error || (complete && !valid ? 'Enter a valid non-negative amount.' : result !== null ? `Reference conversion using bundled rates dated ${CURRENCY_RATE_DATE}. Rates are estimates, not live market quotations.` : 'Enter an amount and choose two currencies.')}
			</p>
		</div>
	);
}
