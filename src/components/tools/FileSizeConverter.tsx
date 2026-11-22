import { useState } from 'react';
import { formatValue, readFiniteNumber } from '../../engines/calculator-format';
import { convertFileSize, fileSizeUnits, type FileSizeUnit } from '../../engines/file-size-converter';

function formatConvertedSize(value: number): string {
	return new Intl.NumberFormat(undefined, { maximumFractionDigits: 8 }).format(value);
}

export default function FileSizeConverter() {
	const [amount, setAmount] = useState('');
	const [from, setFrom] = useState<FileSizeUnit>('MB');
	const [to, setTo] = useState<FileSizeUnit>('MiB');
	const parsedAmount = readFiniteNumber(amount);
	let result: ReturnType<typeof convertFileSize> | null = null;
	let error = '';

	if (amount.trim() !== '' && parsedAmount !== null) {
		try {
			result = convertFileSize(parsedAmount, from, to);
		} catch (cause) {
			error = cause instanceof Error ? cause.message : 'Unable to convert this file size.';
		}
	}

	const swap = () => {
		setFrom(to);
		setTo(from);
	};
	const changeUnit = (side: 'from' | 'to', value: string) => {
		const selectedUnit = fileSizeUnits.find((unit) => unit.id === value);
		if (!selectedUnit) return;
		if (side === 'from') setFrom(selectedUnit.id);
		else setTo(selectedUnit.id);
	};

	return (
		<div>
			<div className="calc-fields">
				<div className="calc-field">
					<label htmlFor="file-size-amount">File size</label>
					<input
						id="file-size-amount"
						type="number"
						min="0"
						step="any"
						inputMode="decimal"
						value={amount}
						onChange={(event) => setAmount(event.target.value)}
						placeholder="e.g. 1.5"
					/>
				</div>
				<div className="calc-field">
					<label htmlFor="file-size-from">From</label>
					<select id="file-size-from" value={from} onChange={(event) => changeUnit('from', event.target.value)}>
						{fileSizeUnits.map((unit) => <option key={unit.id} value={unit.id}>{unit.label}</option>)}
					</select>
				</div>
				<div className="calc-field">
					<label htmlFor="file-size-to">To</label>
					<select id="file-size-to" value={to} onChange={(event) => changeUnit('to', event.target.value)}>
						{fileSizeUnits.map((unit) => <option key={unit.id} value={unit.id}>{unit.label}</option>)}
					</select>
				</div>
			</div>
			<div className="tool-actions">
				<button className="tool-button secondary" type="button" onClick={swap} aria-label="Swap file size units">⇄ Swap units</button>
			</div>
			<div className="calc-result-grid" aria-live="polite">
				<div className="calc-result featured">
					<span className="calc-label">CONVERTED SIZE</span>
					<strong>{result ? formatConvertedSize(result.value) : '—'}</strong>
				</div>
				<div className="calc-result">
					<span className="calc-label">EQUIVALENT BYTES</span>
					<strong>{result ? `${formatValue(result.bytes)} B` : '—'}</strong>
				</div>
			</div>
			<p className={`tool-message${error || (amount.trim() !== '' && parsedAmount === null) ? ' error' : ''}`} role="status">
				{error || (amount.trim() !== '' && parsedAmount === null)
					? error || 'Enter a finite, non-negative file size.'
					: result
						? 'Conversion calculated locally. KB, MB, GB and TB use decimal units; KiB, MiB, GiB and TiB use binary units.'
						: 'Enter a size and select the units to convert.'}
			</p>
		</div>
	);
}
