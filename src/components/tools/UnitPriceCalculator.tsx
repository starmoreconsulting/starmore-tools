import { useState } from 'react';
import { formatAmount, formatValue, readFiniteNumber } from '../../engines/calculator-format';
import { compareUnitPrices } from '../../engines/calculators/unit-price-calculator';

function formatUnitPrice(value: number): string {
	return new Intl.NumberFormat(undefined, {
		minimumFractionDigits: 2,
		maximumFractionDigits: 8,
	}).format(value);
}

export default function UnitPriceCalculator() {
	const [firstPrice, setFirstPrice] = useState('');
	const [firstQuantity, setFirstQuantity] = useState('');
	const [secondPrice, setSecondPrice] = useState('');
	const [secondQuantity, setSecondQuantity] = useState('');

	const values = [firstPrice, firstQuantity, secondPrice, secondQuantity].map(readFiniteNumber);
	const complete = [firstPrice, firstQuantity, secondPrice, secondQuantity].every((value) => value.trim() !== '');
	const valid = complete && values.every((value) => value !== null);
	let comparison = null;
	let errorMessage = '';
	if (valid) {
		try {
			comparison = compareUnitPrices(values[0]!, values[1]!, values[2]!, values[3]!);
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Check the values and try again.';
		}
	}

	const betterValue = comparison?.betterValue === 'same'
		? 'Both products have the same unit price.'
		: comparison?.betterValue === 'first'
			? 'Product 1 has the lower price per unit.'
			: comparison?.betterValue === 'second'
				? 'Product 2 has the lower price per unit.'
				: '';

	return (
		<div>
			<div className="calc-fields">
				<div className="calc-field">
					<label htmlFor="unit-price-first-price">Product 1 price</label>
					<input id="unit-price-first-price" type="number" min="0" step="any" inputMode="decimal" value={firstPrice} onChange={(event) => setFirstPrice(event.target.value)} placeholder="4.00" />
				</div>
				<div className="calc-field">
					<label htmlFor="unit-price-first-quantity">Product 1 quantity</label>
					<input id="unit-price-first-quantity" type="number" min="0" step="any" inputMode="decimal" value={firstQuantity} onChange={(event) => setFirstQuantity(event.target.value)} placeholder="500" />
				</div>
				<div className="calc-field">
					<label htmlFor="unit-price-second-price">Product 2 price</label>
					<input id="unit-price-second-price" type="number" min="0" step="any" inputMode="decimal" value={secondPrice} onChange={(event) => setSecondPrice(event.target.value)} placeholder="7.00" />
				</div>
				<div className="calc-field">
					<label htmlFor="unit-price-second-quantity">Product 2 quantity</label>
					<input id="unit-price-second-quantity" type="number" min="0" step="any" inputMode="decimal" value={secondQuantity} onChange={(event) => setSecondQuantity(event.target.value)} placeholder="1000" />
				</div>
			</div>
			<div className="calc-result-grid" aria-live="polite">
				<div className="calc-result">
					<span className="calc-label">PRODUCT 1 PRICE PER UNIT</span>
					<strong>{comparison ? formatUnitPrice(comparison.firstUnitPrice) : '—'}</strong>
				</div>
				<div className="calc-result">
					<span className="calc-label">PRODUCT 2 PRICE PER UNIT</span>
					<strong>{comparison ? formatUnitPrice(comparison.secondUnitPrice) : '—'}</strong>
				</div>
				<div className="calc-result featured">
					<span className="calc-label">DIFFERENCE PER UNIT</span>
					<strong>{comparison ? formatUnitPrice(comparison.differencePerUnit) : '—'}</strong>
				</div>
				<div className="calc-result">
					<span className="calc-label">LOWER PRICE SAVING</span>
					<strong>{comparison ? `${formatValue(comparison.savingsPercent)}%` : '—'}</strong>
				</div>
			</div>
			<p className={`tool-message${errorMessage ? ' error' : ''}`} role="status">
				{errorMessage || betterValue || 'Enter both prices and quantities to compare value.'}
			</p>
		</div>
	);
}
