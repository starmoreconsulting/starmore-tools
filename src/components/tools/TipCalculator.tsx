import { useState } from 'react';
import { formatAmount, readFiniteNumber } from '../../engines/calculator-format';
import { calculateTip } from '../../engines/calculators/tip-calculator';

export default function TipCalculator() {
	const [bill, setBill] = useState('');
	const [tip, setTip] = useState('15');
	const [people, setPeople] = useState('1');
	const billAmount = readFiniteNumber(bill);
	const tipPercent = readFiniteNumber(tip);
	const peopleCount = readFiniteNumber(people);
	const complete = bill.trim() !== '' && tip.trim() !== '' && people.trim() !== '';
	const valid = complete && billAmount !== null && tipPercent !== null && peopleCount !== null;

	let result = null;
	let errorMessage = '';
	if (valid) {
		try {
			result = calculateTip(billAmount, tipPercent, peopleCount);
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Check the values and try again.';
		}
	}

	return (
		<div>
			<div className="calc-fields">
				<div className="calc-field">
					<label htmlFor="tip-bill">Bill before tip</label>
					<input id="tip-bill" type="number" min="0" step="any" inputMode="decimal" value={bill} onChange={(event) => setBill(event.target.value)} placeholder="50.00" />
				</div>
				<div className="calc-field">
					<label htmlFor="tip-percent">Tip percentage</label>
					<div className="calc-input-suffix">
						<input id="tip-percent" type="number" min="0" step="any" inputMode="decimal" value={tip} onChange={(event) => setTip(event.target.value)} placeholder="15" />
						<span>%</span>
					</div>
				</div>
				<div className="calc-field">
					<label htmlFor="tip-people">Split between</label>
					<input id="tip-people" type="number" min="1" step="1" inputMode="numeric" value={people} onChange={(event) => setPeople(event.target.value)} placeholder="1" />
				</div>
			</div>
			<div className="calc-result-grid" aria-live="polite">
				<div className="calc-result">
					<span className="calc-label">TIP AMOUNT</span>
					<strong>{result ? formatAmount(result.tipAmount) : '—'}</strong>
				</div>
				<div className="calc-result featured">
					<span className="calc-label">TOTAL BILL</span>
					<strong>{result ? formatAmount(result.totalAmount) : '—'}</strong>
				</div>
				<div className="calc-result">
					<span className="calc-label">TIP PER PERSON</span>
					<strong>{result ? formatAmount(result.tipPerPerson) : '—'}</strong>
				</div>
				<div className="calc-result">
					<span className="calc-label">TOTAL PER PERSON</span>
					<strong>{result ? formatAmount(result.totalPerPerson) : '—'}</strong>
				</div>
			</div>
			<p className={`tool-message${errorMessage ? ' error' : ''}`} role="status">
				{errorMessage || (result
					? 'Tip and bill amounts are split evenly across the group.'
					: 'Enter the bill and tip percentage to see the total and split.')}
			</p>
		</div>
	);
}
