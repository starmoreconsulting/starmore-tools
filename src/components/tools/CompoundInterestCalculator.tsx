import { useState } from 'react';
import { formatAmount, readFiniteNumber } from '../../engines/calculator-format';

const frequencies = [
	{ label: 'Annually', value: 1 },
	{ label: 'Semi-annually', value: 2 },
	{ label: 'Quarterly', value: 4 },
	{ label: 'Monthly', value: 12 },
	{ label: 'Daily', value: 365 },
] as const;

function calculate(principal: number, annualRate: number, years: number, frequency: number, contribution: number) {
	const monthlyRate = Math.expm1(Math.log1p(annualRate / frequency) * frequency / 12);
	if (!Number.isFinite(monthlyRate)) return null;

	let balance = principal;
	const months = years * 12;
	for (let month = 0; month < months; month += 1) {
		balance = balance * (1 + monthlyRate) + contribution;
		if (!Number.isFinite(balance)) return null;
	}

	const interest = balance - principal - contribution * months;
	return { balance, interest: Math.max(0, interest) };
}

export default function CompoundInterestCalculator() {
	const [principalInput, setPrincipalInput] = useState('');
	const [rateInput, setRateInput] = useState('');
	const [yearsInput, setYearsInput] = useState('');
	const [frequencyInput, setFrequencyInput] = useState('12');
	const [contributionInput, setContributionInput] = useState('');

	const principal = readFiniteNumber(principalInput);
	const rate = readFiniteNumber(rateInput);
	const years = readFiniteNumber(yearsInput);
	const contribution = contributionInput.trim() === '' ? 0 : readFiniteNumber(contributionInput);
	const frequency = Number(frequencyInput);
	const months = years !== null ? Math.round(years * 12) : 0;
	const complete = principalInput.trim() !== '' && rateInput.trim() !== '' && yearsInput.trim() !== '';
	const valid = complete && principal !== null && rate !== null && years !== null && contribution !== null
		&& principal >= 0 && rate >= 0 && years > 0 && years <= 1000
		&& Number.isSafeInteger(months) && Math.abs(years * 12 - months) < 1e-8
		&& contribution >= 0 && frequencies.some((option) => option.value === frequency);
	const result = valid ? calculate(principal!, rate! / 100, years!, frequency, contribution!) : null;
	const overflow = valid && result === null;

	return (
		<div>
			<div className="calc-fields three-columns">
				<div className="calc-field">
					<label htmlFor="compound-principal">Principal</label>
					<input id="compound-principal" type="number" min="0" step="any" inputMode="decimal" value={principalInput} onChange={(event) => setPrincipalInput(event.target.value)} placeholder="10,000" />
				</div>
				<div className="calc-field">
					<label htmlFor="compound-rate">Annual interest rate</label>
					<div className="calc-input-suffix">
						<input id="compound-rate" type="number" min="0" step="any" inputMode="decimal" value={rateInput} onChange={(event) => setRateInput(event.target.value)} placeholder="5" />
						<span>%</span>
					</div>
				</div>
				<div className="calc-field">
					<label htmlFor="compound-years">Years</label>
					<input id="compound-years" type="number" min="0.0833333333" max="1000" step="any" inputMode="decimal" value={yearsInput} onChange={(event) => setYearsInput(event.target.value)} placeholder="10" />
				</div>
				<div className="calc-field">
					<label htmlFor="compound-frequency">Compounding frequency</label>
					<select id="compound-frequency" value={frequencyInput} onChange={(event) => setFrequencyInput(event.target.value)}>
						{frequencies.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
					</select>
				</div>
				<div className="calc-field">
					<label htmlFor="compound-contribution">Monthly contribution (optional)</label>
					<input id="compound-contribution" type="number" min="0" step="any" inputMode="decimal" value={contributionInput} onChange={(event) => setContributionInput(event.target.value)} placeholder="0" />
				</div>
			</div>
			<div className="calc-result-grid" aria-live="polite">
				<div className="calc-result featured">
					<span className="calc-label">FINAL BALANCE</span>
					<strong>{result ? formatAmount(result.balance) : '—'}</strong>
				</div>
				<div className="calc-result">
					<span className="calc-label">INTEREST EARNED</span>
					<strong>{result ? formatAmount(result.interest) : '—'}</strong>
				</div>
			</div>
			<p className={`tool-message${complete && (!valid || overflow) ? ' error' : ''}`} role="status">
				{overflow ? 'These values are too large to calculate safely.'
					: complete && !valid ? 'Enter a non-negative principal, rate, and contribution, plus a term over zero up to 1,000 years in whole months.'
						: result ? 'Monthly contributions are assumed to be added at the end of each month.'
							: 'Enter the principal, annual rate, and term to estimate growth.'}
			</p>
		</div>
	);
}
