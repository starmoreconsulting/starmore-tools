import { useState } from 'react';
import { calculatePercentage, type PercentageCalculation } from '../../engines/calculators/percentage-calculator';

function formatNumber(value: number) {
	return new Intl.NumberFormat(undefined, { maximumFractionDigits: 8 }).format(value);
}

export default function PercentageCalculator() {
	const [mode, setMode] = useState<PercentageCalculation>('percent-of');
	const [first, setFirst] = useState('');
	const [second, setSecond] = useState('');

	const firstValue = Number(first);
	const secondValue = Number(second);
	const hasValues = first.trim() !== '' && second.trim() !== '' && Number.isFinite(firstValue) && Number.isFinite(secondValue);
	let result: number | null = null;
	let errorMessage = '';
	if (hasValues) {
		try {
			result = calculatePercentage(mode, firstValue, secondValue);
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Check the values and try again.';
		}
	}

	const question = mode === 'percent-of'
		? <>What is <input aria-label="Percentage" inputMode="decimal" type="number" value={first} onChange={(event) => setFirst(event.target.value)} placeholder="15" />% of <input aria-label="Number" inputMode="decimal" type="number" value={second} onChange={(event) => setSecond(event.target.value)} placeholder="200" />?</>
		: mode === 'what-percent'
			? <><input aria-label="Part" inputMode="decimal" type="number" value={first} onChange={(event) => setFirst(event.target.value)} placeholder="30" /> is what percent of <input aria-label="Whole" inputMode="decimal" type="number" value={second} onChange={(event) => setSecond(event.target.value)} placeholder="200" />?</>
			: <>What is the percentage change from <input aria-label="Starting value" inputMode="decimal" type="number" value={first} onChange={(event) => setFirst(event.target.value)} placeholder="80" /> to <input aria-label="Ending value" inputMode="decimal" type="number" value={second} onChange={(event) => setSecond(event.target.value)} placeholder="100" />?</>;

	return (
		<div className="percentage-calculator">
			<div className="percentage-tabs" role="tablist" aria-label="Calculation type">
				<button className={`percentage-tab${mode === 'percent-of' ? ' active' : ''}`} role="tab" aria-selected={mode === 'percent-of'} onClick={() => setMode('percent-of')}>Find a percentage</button>
				<button className={`percentage-tab${mode === 'what-percent' ? ' active' : ''}`} role="tab" aria-selected={mode === 'what-percent'} onClick={() => setMode('what-percent')}>Find what percent</button>
				<button className={`percentage-tab${mode === 'change' ? ' active' : ''}`} role="tab" aria-selected={mode === 'change'} onClick={() => setMode('change')}>Percentage change</button>
			</div>
			<div className="percentage-question">{question}</div>
			<div className="percentage-result" aria-live="polite">
				<span className="percentage-result-label">RESULT</span>
				<strong>{result === null ? '—' : `${formatNumber(result)}${mode === 'percent-of' ? '' : '%'}`}</strong>
				{errorMessage && <span className="percentage-error">{errorMessage}</span>}
			</div>
		</div>
	);
}
