import { useState } from 'react';
import { formatAmount, readFiniteNumber } from '../../engines/calculator-format';

type TimeUnit = 'years' | 'months';

export default function SimpleInterestCalculator() {
	const [principal, setPrincipal] = useState('');
	const [rate, setRate] = useState('');
	const [time, setTime] = useState('');
	const [timeUnit, setTimeUnit] = useState<TimeUnit>('years');
	const principalValue = readFiniteNumber(principal);
	const rateValue = readFiniteNumber(rate);
	const timeValue = readFiniteNumber(time);
	const complete = principal.trim() !== '' && rate.trim() !== '' && time.trim() !== '';
	const valid = complete && principalValue !== null && rateValue !== null && timeValue !== null
		&& principalValue >= 0 && rateValue >= 0 && timeValue >= 0;
	const years = valid ? timeValue! / (timeUnit === 'months' ? 12 : 1) : 0;
	const interest = valid ? principalValue! * (rateValue! / 100) * years : null;
	const total = interest === null ? null : principalValue! + interest;
	const overflow = valid && (!Number.isFinite(interest) || !Number.isFinite(total));

	return (
		<div>
			<div className="calc-fields">
				<div className="calc-field">
					<label htmlFor="simple-interest-principal">Principal</label>
					<input id="simple-interest-principal" type="number" min="0" step="any" inputMode="decimal" value={principal} onChange={(event) => setPrincipal(event.target.value)} placeholder="1000" />
				</div>
				<div className="calc-field">
					<label htmlFor="simple-interest-rate">Annual interest rate</label>
					<div className="calc-input-suffix">
						<input id="simple-interest-rate" type="number" min="0" step="any" inputMode="decimal" value={rate} onChange={(event) => setRate(event.target.value)} placeholder="5" />
						<span>%</span>
					</div>
				</div>
				<div className="calc-field">
					<label htmlFor="simple-interest-time">Time</label>
					<input id="simple-interest-time" type="number" min="0" step="any" inputMode="decimal" value={time} onChange={(event) => setTime(event.target.value)} placeholder="2" />
				</div>
				<div className="calc-field">
					<label htmlFor="simple-interest-unit">Time unit</label>
					<select id="simple-interest-unit" value={timeUnit} onChange={(event) => setTimeUnit(event.target.value as TimeUnit)}>
						<option value="years">Years</option>
						<option value="months">Months</option>
					</select>
				</div>
			</div>
			<div className="calc-result-grid">
				<div className="calc-result">
					<span className="calc-label">SIMPLE INTEREST</span>
					<strong>{!valid || overflow ? '—' : formatAmount(interest!)}</strong>
				</div>
				<div className="calc-result featured">
					<span className="calc-label">TOTAL AMOUNT</span>
					<strong>{!valid || overflow ? '—' : formatAmount(total!)}</strong>
				</div>
			</div>
			<p className={`tool-message${(complete && !valid) || overflow ? ' error' : ''}`} role="status">
				{overflow ? 'These values are too large to calculate safely.'
					: complete && !valid ? 'Enter valid, non-negative principal, rate, and time values.'
						: valid ? 'Interest is calculated on the original principal only.'
							: 'Enter the principal, annual rate, and time period.'}
			</p>
		</div>
	);
}
