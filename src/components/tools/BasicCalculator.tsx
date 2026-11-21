import { useState } from 'react';
import { calculateBasicExpression } from '../../engines/calculators/basic-calculator';

const keys = [
	['clear', 'AC'], ['backspace', '⌫'], ['(', '('], [')', ')'],
	['7', '7'], ['8', '8'], ['9', '9'], ['/', '÷'],
	['4', '4'], ['5', '5'], ['6', '6'], ['*', '×'],
	['1', '1'], ['2', '2'], ['3', '3'], ['-', '−'],
	['%', '%'], ['0', '0'], ['.', '.'], ['+', '+'],
] as const;

function formatResult(value: number): string {
	return new Intl.NumberFormat(undefined, { maximumSignificantDigits: 12 }).format(value);
}

export default function BasicCalculator() {
	const [expression, setExpression] = useState('');

	let result: string | null = null;
	let errorMessage = '';
	if (expression.trim()) {
		try {
			result = formatResult(calculateBasicExpression(expression));
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Check the expression and try again.';
		}
	}

	const updateExpression = (next: string) => {
		setExpression(next);
	};

	return (
		<section className="basic-calculator" aria-label="Basic calculator">
			<label className="calc-field">
				<span>Expression</span>
				<input
					aria-label="Calculator expression"
					inputMode="decimal"
					value={expression}
					onChange={(event) => updateExpression(event.target.value)}
					onKeyDown={(event) => {
						if (event.key === 'Enter') event.preventDefault();
					}}
					placeholder="e.g. (12 + 8) × 3"
				/>
			</label>
			<div className="tool-actions" aria-label="Calculator keys">
				{keys.map(([key, label]) => (
					<button
						className="tool-button secondary"
						key={key}
						type="button"
						aria-label={key === 'clear' ? 'Clear expression' : key === 'backspace' ? 'Delete last character' : label}
						onClick={() => updateExpression(
							key === 'clear' ? ''
								: key === 'backspace' ? expression.slice(0, -1)
									: expression + key,
						)}
					>
						{label}
					</button>
				))}
			</div>
			<div className="percentage-result" aria-live="polite">
				<span className="percentage-result-label">RESULT</span>
				<strong>{result ?? '—'}</strong>
				{errorMessage && <span className="percentage-error">{errorMessage}</span>}
			</div>
			<p className="tool-message" role="status">Calculations run on this device. Use parentheses to control order.</p>
		</section>
	);
}
