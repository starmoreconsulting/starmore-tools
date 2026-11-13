import { useState } from 'react';
import { formatAmount, readFiniteNumber } from '../../engines/calculator-format';

export default function DiscountCalculator() {
	const [price, setPrice] = useState('');
	const [discount, setDiscount] = useState('');
	const originalPrice = readFiniteNumber(price);
	const discountRate = readFiniteNumber(discount);
	const complete = price.trim() !== '' && discount.trim() !== '';
	const valid = complete && originalPrice !== null && discountRate !== null
		&& originalPrice >= 0 && discountRate >= 0 && discountRate <= 100;
	const savings = valid ? originalPrice * (discountRate / 100) : null;
	const finalPrice = savings === null ? null : originalPrice! - savings;
	const overflow = valid && (!Number.isFinite(savings) || !Number.isFinite(finalPrice));

	return (
		<div>
			<div className="calc-fields">
				<div className="calc-field">
					<label htmlFor="discount-price">Original price</label>
					<input id="discount-price" type="number" min="0" step="any" inputMode="decimal" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="100.00" />
				</div>
				<div className="calc-field">
					<label htmlFor="discount-rate">Discount</label>
					<div className="calc-input-suffix">
						<input id="discount-rate" type="number" min="0" max="100" step="any" inputMode="decimal" value={discount} onChange={(event) => setDiscount(event.target.value)} placeholder="20" />
						<span>%</span>
					</div>
				</div>
			</div>
			<div className="calc-result-grid" aria-live="polite">
				<div className="calc-result">
					<span className="calc-label">YOU SAVE</span>
					<strong>{!valid || overflow ? '—' : formatAmount(savings!)}</strong>
				</div>
				<div className="calc-result featured">
					<span className="calc-label">PRICE AFTER DISCOUNT</span>
					<strong>{!valid || overflow ? '—' : formatAmount(finalPrice!)}</strong>
				</div>
			</div>
			<p className={`tool-message${complete && !valid || overflow ? ' error' : ''}`} role="status">
				{overflow ? 'These values are too large to calculate safely.'
					: complete && !valid ? 'Enter a valid non-negative price and a discount between 0% and 100%.'
						: valid ? 'Discount applied to the original price.'
							: 'Enter the original price and discount to see your savings.'}
			</p>
		</div>
	);
}
