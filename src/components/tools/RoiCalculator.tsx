import { useState } from 'react';
import { formatAmount, formatValue, readFiniteNumber } from '../../engines/calculator-format';

export default function RoiCalculator() {
	const [investment, setInvestment] = useState('');
	const [totalReturn, setTotalReturn] = useState('');
	const investmentValue = readFiniteNumber(investment);
	const returnValue = readFiniteNumber(totalReturn);
	const complete = investment.trim() !== '' && totalReturn.trim() !== '';
	const valid = complete && investmentValue !== null && returnValue !== null && investmentValue > 0 && returnValue >= 0;
	const netProfit = valid ? returnValue - investmentValue : null;
	const roi = valid && investmentValue !== null ? (netProfit! / investmentValue) * 100 : null;
	const overflow = valid && (netProfit === null || roi === null || !Number.isFinite(netProfit) || !Number.isFinite(roi));

	return (
		<div>
			<div className="calc-fields">
				<div className="calc-field">
					<label htmlFor="roi-investment">Initial investment</label>
					<input id="roi-investment" type="number" min="0" step="any" inputMode="decimal" value={investment} onChange={(event) => setInvestment(event.target.value)} placeholder="1000" />
				</div>
				<div className="calc-field">
					<label htmlFor="roi-return">Total return / proceeds</label>
					<input id="roi-return" type="number" min="0" step="any" inputMode="decimal" value={totalReturn} onChange={(event) => setTotalReturn(event.target.value)} placeholder="1250" />
				</div>
			</div>
			<div className="calc-result-grid">
				<div className="calc-result">
					<span className="calc-label">NET PROFIT / LOSS</span>
					<strong>{!valid || overflow ? '—' : formatAmount(netProfit!)}</strong>
				</div>
				<div className="calc-result featured">
					<span className="calc-label">RETURN ON INVESTMENT</span>
					<strong>{!valid || overflow ? '—' : `${formatValue(roi!)}%`}</strong>
				</div>
			</div>
			<p className={`tool-message${(complete && !valid) || overflow ? ' error' : ''}`} role="status">
				{overflow ? 'These values are too large to calculate safely.'
					: complete && !valid ? 'Enter a finite, positive investment and a non-negative total return.'
						: valid ? 'ROI is based on total proceeds compared with the initial investment.'
							: 'Enter the initial investment and total return to calculate ROI.'}
			</p>
		</div>
	);
}
