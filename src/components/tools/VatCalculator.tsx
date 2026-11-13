import { useState } from 'react';
import { formatAmount, readFiniteNumber } from '../../engines/calculator-format';

type VatMode = 'add' | 'remove';

export default function VatCalculator() {
	const [mode, setMode] = useState<VatMode>('add');
	const [price, setPrice] = useState('');
	const [rate, setRate] = useState('20');
	const amount = readFiniteNumber(price);
	const taxRate = readFiniteNumber(rate);
	const complete = price.trim() !== '' && rate.trim() !== '';
	const valid = complete && amount !== null && taxRate !== null && amount >= 0 && taxRate >= 0;
	const factor = valid ? 1 + taxRate! / 100 : 1;
	const net = valid ? (mode === 'add' ? amount! : amount! / factor) : null;
	const vat = valid && net !== null ? (mode === 'add' ? amount! * (taxRate! / 100) : amount! - net) : null;
	const total = valid ? (mode === 'add' ? amount! + vat! : amount!) : null;
	const overflow = valid && [net, vat, total].some((value) => value === null || !Number.isFinite(value));

	return (
		<div>
			<div className="percentage-tabs" role="tablist" aria-label="VAT calculation">
				<button className={`percentage-tab${mode === 'add' ? ' active' : ''}`} role="tab" aria-selected={mode === 'add'} onClick={() => setMode('add')}>Add VAT</button>
				<button className={`percentage-tab${mode === 'remove' ? ' active' : ''}`} role="tab" aria-selected={mode === 'remove'} onClick={() => setMode('remove')}>Remove VAT</button>
			</div>
			<div className="calc-fields">
				<div className="calc-field">
					<label htmlFor="vat-price">{mode === 'add' ? 'Price before VAT' : 'Price including VAT'}</label>
					<input id="vat-price" type="number" min="0" step="any" inputMode="decimal" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="100.00" />
				</div>
				<div className="calc-field">
					<label htmlFor="vat-rate">VAT / tax rate</label>
					<div className="calc-input-suffix">
						<input id="vat-rate" type="number" min="0" step="any" inputMode="decimal" value={rate} onChange={(event) => setRate(event.target.value)} placeholder="20" />
						<span>%</span>
					</div>
				</div>
			</div>
			<div className="calc-result-grid" aria-live="polite">
				<div className="calc-result">
					<span className="calc-label">{mode === 'add' ? 'VAT AMOUNT' : 'VAT INCLUDED'}</span>
					<strong>{!valid || overflow ? '—' : formatAmount(vat!)}</strong>
				</div>
				<div className="calc-result featured">
					<span className="calc-label">{mode === 'add' ? 'PRICE INCLUDING VAT' : 'PRICE BEFORE VAT'}</span>
					<strong>{!valid || overflow ? '—' : formatAmount(mode === 'add' ? total! : net!)}</strong>
				</div>
			</div>
			<p className={`tool-message${complete && !valid || overflow ? ' error' : ''}`} role="status">
				{overflow ? 'These values are too large to calculate safely.'
					: complete && !valid ? 'Enter a valid non-negative price and tax rate.'
						: valid ? 'VAT calculated using the rate you entered.'
							: 'Choose a mode and enter a price and rate to calculate VAT.'}
			</p>
		</div>
	);
}
