import { useState } from 'react';
import { formatAmount, formatValue, readFiniteNumber } from '../../engines/calculator-format';
import { calculateBreakEven } from '../../engines/calculators/break-even-calculator';

export default function BreakEvenCalculator() {
	const [fixedCosts, setFixedCosts] = useState('');
	const [sellingPrice, setSellingPrice] = useState('');
	const [variableCost, setVariableCost] = useState('');
	const fixedValue = readFiniteNumber(fixedCosts);
	const priceValue = readFiniteNumber(sellingPrice);
	const variableValue = readFiniteNumber(variableCost);
	const complete = fixedCosts.trim() !== '' && sellingPrice.trim() !== '' && variableCost.trim() !== '';
	const valid = complete && fixedValue !== null && priceValue !== null && variableValue !== null
		&& fixedValue >= 0 && priceValue >= 0 && variableValue >= 0;

	let result = null;
	let error = '';
	if (valid) {
		try {
			result = calculateBreakEven(fixedValue!, priceValue!, variableValue!);
		} catch (cause) {
			error = cause instanceof Error ? cause.message : 'Unable to calculate this result.';
		}
	}

	return (
		<div>
			<div className="calc-fields calc-fields-three">
				<div className="calc-field">
					<label htmlFor="break-even-fixed">Fixed costs</label>
					<input id="break-even-fixed" type="number" min="0" step="any" inputMode="decimal" value={fixedCosts} onChange={(event) => setFixedCosts(event.target.value)} placeholder="1000.00" />
				</div>
				<div className="calc-field">
					<label htmlFor="break-even-price">Selling price per unit</label>
					<input id="break-even-price" type="number" min="0" step="any" inputMode="decimal" value={sellingPrice} onChange={(event) => setSellingPrice(event.target.value)} placeholder="50.00" />
				</div>
				<div className="calc-field">
					<label htmlFor="break-even-variable">Variable cost per unit</label>
					<input id="break-even-variable" type="number" min="0" step="any" inputMode="decimal" value={variableCost} onChange={(event) => setVariableCost(event.target.value)} placeholder="30.00" />
				</div>
			</div>
			<div className="calc-result-grid three-columns" aria-live="polite">
				<div className="calc-result featured">
					<span className="calc-label">BREAK-EVEN UNITS</span>
					<strong>{!result ? '—' : formatValue(result.units)}</strong>
				</div>
				<div className="calc-result">
					<span className="calc-label">BREAK-EVEN REVENUE</span>
					<strong>{!result ? '—' : formatAmount(result.revenue)}</strong>
				</div>
				<div className="calc-result">
					<span className="calc-label">CONTRIBUTION / UNIT</span>
					<strong>{!result ? '—' : formatAmount(result.contributionPerUnit)}</strong>
				</div>
			</div>
			<p className={`tool-message${complete && (!valid || error) ? ' error' : ''}`} role="status">
				{error || (complete && !valid ? 'Enter valid non-negative costs and prices.' : result ? 'Units and revenue show the estimated point at which contribution covers fixed costs.' : 'Enter fixed costs and unit prices to calculate the break-even point.')}
			</p>
		</div>
	);
}
