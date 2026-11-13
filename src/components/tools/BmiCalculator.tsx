import { useState } from 'react';
import { formatValue, readFiniteNumber } from '../../engines/calculator-format';

type UnitSystem = 'metric' | 'imperial';

function getCategory(bmi: number): string {
	if (bmi < 18.5) return 'Below the general adult range';
	if (bmi < 25) return 'Within the general adult range';
	if (bmi < 30) return 'Above the general adult range';
	return 'High adult BMI range';
}

export default function BmiCalculator() {
	const [system, setSystem] = useState<UnitSystem>('metric');
	const [weightKg, setWeightKg] = useState('');
	const [heightCm, setHeightCm] = useState('');
	const [weightLb, setWeightLb] = useState('');
	const [heightFt, setHeightFt] = useState('');
	const [heightIn, setHeightIn] = useState('');

	const metricWeight = readFiniteNumber(weightKg);
	const metricHeight = readFiniteNumber(heightCm);
	const imperialWeight = readFiniteNumber(weightLb);
	const feet = readFiniteNumber(heightFt);
	const inches = heightIn.trim() === '' ? 0 : readFiniteNumber(heightIn);
	const complete = system === 'metric'
		? weightKg.trim() !== '' && heightCm.trim() !== ''
		: weightLb.trim() !== '' && heightFt.trim() !== '';

	let bmi: number | null = null;
	let valid = false;
	if (system === 'metric' && metricWeight !== null && metricHeight !== null && metricWeight > 0 && metricHeight > 0) {
		bmi = metricWeight / ((metricHeight / 100) ** 2);
		valid = Number.isFinite(bmi);
	} else if (system === 'imperial' && imperialWeight !== null && feet !== null && inches !== null
		&& imperialWeight > 0 && feet >= 0 && inches >= 0 && feet * 12 + inches > 0) {
		bmi = (703 * imperialWeight) / ((feet * 12 + inches) ** 2);
		valid = Number.isFinite(bmi);
	}

	const invalid = complete && !valid;

	return (
		<div>
			<div className="tool-choice-row" role="group" aria-label="Measurement system">
				<label className="tool-choice">
					<input type="radio" name="bmi-system" checked={system === 'metric'} onChange={() => setSystem('metric')} />
					<span>Metric (kg, cm)</span>
				</label>
				<label className="tool-choice">
					<input type="radio" name="bmi-system" checked={system === 'imperial'} onChange={() => setSystem('imperial')} />
					<span>Imperial (lb, ft/in)</span>
				</label>
			</div>
			{system === 'metric' ? (
				<div className="calc-fields">
					<div className="calc-field">
						<label htmlFor="bmi-weight-kg">Weight (kg)</label>
						<input id="bmi-weight-kg" type="number" min="0" step="any" inputMode="decimal" value={weightKg} onChange={(event) => setWeightKg(event.target.value)} placeholder="70" />
					</div>
					<div className="calc-field">
						<label htmlFor="bmi-height-cm">Height (cm)</label>
						<input id="bmi-height-cm" type="number" min="0" step="any" inputMode="decimal" value={heightCm} onChange={(event) => setHeightCm(event.target.value)} placeholder="175" />
					</div>
				</div>
			) : (
				<div className="calc-fields three-columns">
					<div className="calc-field">
						<label htmlFor="bmi-weight-lb">Weight (lb)</label>
						<input id="bmi-weight-lb" type="number" min="0" step="any" inputMode="decimal" value={weightLb} onChange={(event) => setWeightLb(event.target.value)} placeholder="154" />
					</div>
					<div className="calc-field">
						<label htmlFor="bmi-height-ft">Height (ft)</label>
						<input id="bmi-height-ft" type="number" min="0" step="any" inputMode="decimal" value={heightFt} onChange={(event) => setHeightFt(event.target.value)} placeholder="5" />
					</div>
					<div className="calc-field">
						<label htmlFor="bmi-height-in">Additional inches</label>
						<input id="bmi-height-in" type="number" min="0" step="any" inputMode="decimal" value={heightIn} onChange={(event) => setHeightIn(event.target.value)} placeholder="9" />
					</div>
				</div>
			)}
			<div className="calc-result-grid">
				<div className="calc-result featured">
					<span className="calc-label">BODY MASS INDEX</span>
					<strong>{!valid || bmi === null ? '—' : formatValue(bmi)}</strong>
				</div>
				<div className="calc-result">
					<span className="calc-label">GENERAL ADULT GUIDE</span>
					<strong className="unit-result-label">{!valid || bmi === null ? '—' : getCategory(bmi)}</strong>
				</div>
			</div>
			<p className={`tool-message${invalid ? ' error' : ''}`} role="status">
				{invalid ? 'Enter a valid positive weight and height. Imperial height must be greater than zero.'
					: valid ? 'BMI is a general screening measure for adults, not a diagnosis.'
						: 'Enter your height and weight to calculate BMI.'}
			</p>
			<p className="inline-note">BMI categories are a general guide for adults and may not suit every person.</p>
		</div>
	);
}
