import { useState } from 'react';
import { calculateFraction, type FractionOperation } from '../../engines/calculators/fraction-calculator';

const operations: { value: FractionOperation; label: string }[] = [
	{ value: 'add', label: 'Add (+)' },
	{ value: 'subtract', label: 'Subtract (−)' },
	{ value: 'multiply', label: 'Multiply (×)' },
	{ value: 'divide', label: 'Divide (÷)' },
];

export default function FractionCalculator() {
	const [firstNumerator, setFirstNumerator] = useState('');
	const [firstDenominator, setFirstDenominator] = useState('');
	const [secondNumerator, setSecondNumerator] = useState('');
	const [secondDenominator, setSecondDenominator] = useState('');
	const [operation, setOperation] = useState<FractionOperation>('add');
	const complete = [firstNumerator, firstDenominator, secondNumerator, secondDenominator]
		.every((value) => value.trim() !== '');

	let result = null;
	let errorMessage = '';
	if (complete) {
		try {
			result = calculateFraction(firstNumerator, firstDenominator, secondNumerator, secondDenominator, operation);
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Check the fractions and try again.';
		}
	}

	return (
		<div>
			<div className="calc-fields">
				<div className="calc-field">
					<label htmlFor="fraction-first-numerator">First numerator</label>
					<input id="fraction-first-numerator" type="text" inputMode="numeric" value={firstNumerator} onChange={(event) => setFirstNumerator(event.target.value)} placeholder="1" />
				</div>
				<div className="calc-field">
					<label htmlFor="fraction-first-denominator">First denominator</label>
					<input id="fraction-first-denominator" type="text" inputMode="numeric" value={firstDenominator} onChange={(event) => setFirstDenominator(event.target.value)} placeholder="2" />
				</div>
				<div className="calc-field">
					<label htmlFor="fraction-operation">Operation</label>
					<select id="fraction-operation" value={operation} onChange={(event) => setOperation(event.target.value as FractionOperation)}>
						{operations.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
					</select>
				</div>
				<div className="calc-field">
					<label htmlFor="fraction-second-numerator">Second numerator</label>
					<input id="fraction-second-numerator" type="text" inputMode="numeric" value={secondNumerator} onChange={(event) => setSecondNumerator(event.target.value)} placeholder="1" />
				</div>
				<div className="calc-field">
					<label htmlFor="fraction-second-denominator">Second denominator</label>
					<input id="fraction-second-denominator" type="text" inputMode="numeric" value={secondDenominator} onChange={(event) => setSecondDenominator(event.target.value)} placeholder="3" />
				</div>
			</div>
			<div className="calc-result-grid" aria-live="polite">
				<div className="calc-result featured">
					<span className="calc-label">REDUCED FRACTION</span>
					<strong>{result?.fraction ?? '—'}</strong>
				</div>
				<div className="calc-result">
					<span className="calc-label">DECIMAL (8 PLACES)</span>
					<strong>{result?.decimal ?? '—'}</strong>
				</div>
			</div>
			<p className={`tool-message${errorMessage ? ' error' : ''}`} role="status">
				{errorMessage || (result ? 'Fractions are calculated exactly and reduced to simplest form.' : 'Enter both fractions to calculate.')}
			</p>
		</div>
	);
}
