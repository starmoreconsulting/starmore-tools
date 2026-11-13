import { useState } from 'react';
import { formatAmount, readFiniteNumber } from '../../engines/calculator-format';

export default function LoanRepaymentCalculator() {
	const [principal, setPrincipal] = useState('');
	const [annualRate, setAnnualRate] = useState('');
	const [termYears, setTermYears] = useState('');
	const amount = readFiniteNumber(principal);
	const rate = readFiniteNumber(annualRate);
	const years = readFiniteNumber(termYears);
	const complete = principal.trim() !== '' && annualRate.trim() !== '' && termYears.trim() !== '';
	const valid = complete && amount !== null && rate !== null && years !== null
		&& amount > 0 && rate >= 0 && Number.isSafeInteger(years) && years > 0
		&& Number.isSafeInteger(years * 12);
	const months = valid ? years! * 12 : 0;
	const monthlyRate = valid ? rate! / 1200 : 0;
	const paymentDenominator = valid && monthlyRate > 0
		? -Math.expm1(-months * Math.log1p(monthlyRate))
		: 0;
	const rawPayment = valid
		? monthlyRate === 0
			? amount! / months
			: amount! * monthlyRate / paymentDenominator
		: null;
	const monthlyPayment = rawPayment === null || !Number.isFinite(rawPayment) ? null : Math.round((rawPayment + Number.EPSILON) * 100) / 100;
	const totalPaid = rawPayment === null || !Number.isFinite(rawPayment)
		? null
		: Math.round((rawPayment * months + Number.EPSILON) * 100) / 100;
	const totalInterest = totalPaid === null ? null : Math.round((totalPaid - amount!) * 100) / 100;
	const overflow = valid && (monthlyPayment === null || totalPaid === null || totalInterest === null
		|| !Number.isFinite(totalPaid) || !Number.isFinite(totalInterest) || !Number.isFinite(months));

	return (
		<div>
			<div className="calc-fields three-columns">
				<div className="calc-field">
					<label htmlFor="loan-amount">Loan amount</label>
					<input id="loan-amount" type="number" min="0" step="any" inputMode="decimal" value={principal} onChange={(event) => setPrincipal(event.target.value)} placeholder="20,000" />
				</div>
				<div className="calc-field">
					<label htmlFor="loan-rate">Annual interest rate</label>
					<div className="calc-input-suffix">
						<input id="loan-rate" type="number" min="0" step="any" inputMode="decimal" value={annualRate} onChange={(event) => setAnnualRate(event.target.value)} placeholder="5" />
						<span>%</span>
					</div>
				</div>
				<div className="calc-field">
					<label htmlFor="loan-term">Loan term</label>
					<div className="calc-input-suffix">
						<input id="loan-term" type="number" min="1" step="1" inputMode="numeric" value={termYears} onChange={(event) => setTermYears(event.target.value)} placeholder="5" />
						<span>years</span>
					</div>
				</div>
			</div>
			<div className="calc-result-grid three-columns" aria-live="polite">
				<div className="calc-result featured">
					<span className="calc-label">MONTHLY PAYMENT</span>
					<strong>{!valid || overflow ? '—' : formatAmount(monthlyPayment!)}</strong>
				</div>
				<div className="calc-result">
					<span className="calc-label">TOTAL PAID</span>
					<strong>{!valid || overflow ? '—' : formatAmount(totalPaid!)}</strong>
				</div>
				<div className="calc-result">
					<span className="calc-label">TOTAL INTEREST</span>
					<strong>{!valid || overflow ? '—' : formatAmount(totalInterest!)}</strong>
				</div>
			</div>
			<p className={`tool-message${complete && !valid || overflow ? ' error' : ''}`} role="status">
				{overflow ? 'These values are too large to calculate safely.'
					: complete && !valid ? 'Enter a loan amount above zero, a non-negative annual rate, and a whole-number term of at least one year.'
						: 'This estimate uses fixed monthly payments and excludes fees or rate changes.'}
			</p>
		</div>
	);
}
