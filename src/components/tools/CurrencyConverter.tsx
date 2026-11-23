import { useEffect, useState } from 'react';
import {
	CURRENCY_CODES,
	CURRENCY_RATE_SOURCE,
	CURRENCY_RATE_SOURCE_URL,
	convertCurrency,
	fetchLatestCurrencyRates,
	type CurrencyRates,
} from '../../engines/calculators/currency-converter';
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
	const [rates, setRates] = useState<CurrencyRates | null>(null);
	const [rateDate, setRateDate] = useState('');
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');

	async function refreshRates(signal?: AbortSignal) {
		setLoading(true);
		setRates(null);
		setRateDate('');
		setError('');
		try {
			const latest = await fetchLatestCurrencyRates(fetch, signal);
			setRates(latest.rates);
			setRateDate(latest.date);
		} catch (cause) {
			if (cause instanceof DOMException && cause.name === 'AbortError') return;
			setError(cause instanceof Error ? cause.message : 'Could not load current reference rates.');
		} finally {
			if (!signal?.aborted) setLoading(false);
		}
	}

	useEffect(() => {
		const controller = new AbortController();
		void refreshRates(controller.signal);
		return () => controller.abort();
	}, []);

	const amountValue = readFiniteNumber(amount);
	const complete = amount.trim() !== '';
	const valid = complete && amountValue !== null && amountValue >= 0;
	let result: number | null = null;
	let conversionError = '';
	if (valid && rates) {
		try { result = convertCurrency(amountValue, from, to, rates); } catch (cause) {
			conversionError = cause instanceof Error ? cause.message : 'Unable to convert this amount.';
		}
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
						{CURRENCY_CODES.map((code) => <option key={code} value={code}>{code} — {currencyNames[code]}</option>)}
					</select>
				</div>
				<div className="calc-field">
					<label htmlFor="currency-to">To</label>
					<select id="currency-to" value={to} onChange={(event) => setTo(event.target.value)}>
						{CURRENCY_CODES.map((code) => <option key={code} value={code}>{code} — {currencyNames[code]}</option>)}
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
					<strong>{result === null || !rates ? '—' : `1 ${from} = ${formatAmount(convertCurrency(1, from, to, rates))} ${to}`}</strong>
				</div>
			</div>
			<div className="tool-actions">
				<button className="tool-button secondary" type="button" onClick={() => void refreshRates()} disabled={loading}>
					{loading ? 'Updating rates…' : 'Refresh rates'}
				</button>
			</div>
			<p className={`tool-message${error || conversionError || (complete && !valid) ? ' error' : ''}`} role="status">
				{error || conversionError || (complete && !valid ? 'Enter a valid non-negative amount.' : loading ? 'Loading the latest available reference rates…' : rates ? `Rates dated ${rateDate}. These are reference rates, not live trade quotes. Verify exchange rates, fees, and settlement terms with your bank or payment provider before a transaction.` : 'Current rates are unavailable. Retry when you have an internet connection.')}
			</p>
			<p className="privacy-note">To retrieve the rates, this tool requests currency codes (not your amount) from <a href={CURRENCY_RATE_SOURCE_URL} target="_blank" rel="noopener noreferrer">Frankfurter</a>, a free public service. The conversion amount is calculated in your browser. {CURRENCY_RATE_SOURCE}.</p>
		</div>
	);
}
