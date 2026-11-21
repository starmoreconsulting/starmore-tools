import { useState } from 'react';
import { summarizeNumbers } from '../../engines/calculators/statistics-calculator';

function formatNumber(value: number): string {
	return new Intl.NumberFormat(undefined, { maximumSignificantDigits: 10 }).format(value);
}

export default function StatisticsCalculator() {
	const [source, setSource] = useState('');
	let result = null;
	let errorMessage = '';
	if (source.trim()) {
		try {
			result = summarizeNumbers(source);
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Check the numbers and try again.';
		}
	}

	const modeText = result?.modes === null ? 'No mode'
		: result?.modes ? result.modes.map(formatNumber).join(', ')
			: '—';

	return (
		<div>
			<label className="calc-field">
				<span>Numbers</span>
				<textarea
					aria-label="Numbers to summarize"
					value={source}
					onChange={(event) => setSource(event.target.value)}
					placeholder="e.g. 12, 18, 18, 24"
					rows={4}
				/>
			</label>
			<div className="calc-result-grid" aria-live="polite">
				<div className="calc-result">
					<span className="calc-label">COUNT</span>
					<strong>{result ? result.count.toLocaleString() : '—'}</strong>
				</div>
				<div className="calc-result featured">
					<span className="calc-label">MEAN</span>
					<strong>{result ? formatNumber(result.mean) : '—'}</strong>
				</div>
				<div className="calc-result">
					<span className="calc-label">MEDIAN</span>
					<strong>{result ? formatNumber(result.median) : '—'}</strong>
				</div>
				<div className="calc-result">
					<span className="calc-label">MODE</span>
					<strong>{modeText}</strong>
				</div>
				<div className="calc-result">
					<span className="calc-label">RANGE</span>
					<strong>{result ? formatNumber(result.range) : '—'}</strong>
				</div>
			</div>
			<p className={`tool-message${errorMessage ? ' error' : ''}`} role="status">
				{errorMessage || (result ? 'Numbers are summarized on this device.' : 'Enter numbers separated by commas, spaces, or new lines.')}
			</p>
		</div>
	);
}
