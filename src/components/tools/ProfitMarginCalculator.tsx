import { useState } from 'react';
import { formatAmount, formatValue, readFiniteNumber } from '../../engines/calculator-format';

export default function ProfitMarginCalculator() {
	const [cost, setCost] = useState('');
	const [selling, setSelling] = useState('');
	const costValue = readFiniteNumber(cost);
	const sellingValue = readFiniteNumber(selling);
	const complete = cost.trim() !== '' && selling.trim() !== '';
	const valid = complete && costValue !== null && sellingValue !== null && costValue >= 0 && sellingValue >= 0;
	const profit = valid ? sellingValue! - costValue! : null;
	const margin = valid && sellingValue !== 0 ? profit! / sellingValue! * 100 : null;
	const markup = valid && costValue !== 0 ? profit! / costValue! * 100 : null;
	const overflow = valid && (!Number.isFinite(profit) || (margin !== null && !Number.isFinite(margin)) || (markup !== null && !Number.isFinite(markup)));

	return (
		<div>
			<div className="calc-fields">
				<div className="calc-field">
					<label htmlFor="profit-cost">Cost price</label>
					<input id="profit-cost" type="number" min="0" step="any" inputMode="decimal" value={cost} onChange={(event) => setCost(event.target.value)} placeholder="60.00" />
				</div>
				<div className="calc-field">
					<label htmlFor="profit-selling">Selling price</label>
					<input id="profit-selling" type="number" min="0" step="any" inputMode="decimal" value={selling} onChange={(event) => setSelling(event.target.value)} placeholder="100.00" />
				</div>
			</div>
			<div className="calc-result-grid three-columns" aria-live="polite">
				<div className="calc-result">
					<span className="calc-label">PROFIT</span>
					<strong>{!valid || overflow ? '—' : formatAmount(profit!)}</strong>
				</div>
				<div className="calc-result featured">
					<span className="calc-label">PROFIT MARGIN</span>
					<strong>{!valid || overflow || margin === null ? '—' : `${formatValue(margin)}%`}</strong>
					{valid && sellingValue === 0 && <small>Unavailable when selling price is zero.</small>}
				</div>
				<div className="calc-result">
					<span className="calc-label">MARKUP</span>
					<strong>{!valid || overflow || markup === null ? '—' : `${formatValue(markup)}%`}</strong>
					{valid && costValue === 0 && <small>Unavailable when cost price is zero.</small>}
				</div>
			</div>
			<p className={`tool-message${complete && !valid || overflow ? ' error' : ''}`} role="status">
				{overflow ? 'These values are too large to calculate safely.'
					: complete && !valid ? 'Enter valid non-negative cost and selling prices.'
						: valid ? 'Results use the cost and selling prices entered above.'
							: 'Enter both prices to compare profit, margin, and markup.'}
			</p>
		</div>
	);
}
