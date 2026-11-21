import { useState } from 'react';
import { formatValue, readFiniteNumber } from '../../engines/calculator-format';
import { calculateElectricity } from '../../engines/calculators/electricity-consumption-calculator';

export default function ElectricityConsumptionCalculator() {
	const [wattage, setWattage] = useState('');
	const [hours, setHours] = useState('');
	const [days, setDays] = useState('30');
	const [tariff, setTariff] = useState('');
	const wattageValue = readFiniteNumber(wattage);
	const hoursValue = readFiniteNumber(hours);
	const daysValue = readFiniteNumber(days);
	const tariffValue = tariff.trim() === '' ? null : readFiniteNumber(tariff);
	const complete = wattage.trim() !== '' && hours.trim() !== '' && days.trim() !== '';
	const valid = complete && wattageValue !== null && hoursValue !== null && daysValue !== null
		&& (tariff.trim() === '' || tariffValue !== null) && wattageValue >= 0 && hoursValue >= 0 && daysValue >= 0;

	let result = null;
	let error = '';
	if (valid) {
		try { result = calculateElectricity(wattageValue!, hoursValue!, daysValue!, tariffValue); }
		catch (cause) { error = cause instanceof Error ? cause.message : 'Unable to calculate this result.'; }
	}

	return (
		<div>
			<div className="calc-fields">
				<div className="calc-field"><label htmlFor="electricity-wattage">Power consumption</label><div className="calc-input-suffix"><input id="electricity-wattage" type="number" min="0" step="any" inputMode="decimal" value={wattage} onChange={(event) => setWattage(event.target.value)} placeholder="1000" /><span>watts</span></div></div>
				<div className="calc-field"><label htmlFor="electricity-hours">Hours used per day</label><input id="electricity-hours" type="number" min="0" max="24" step="any" inputMode="decimal" value={hours} onChange={(event) => setHours(event.target.value)} placeholder="5" /></div>
				<div className="calc-field"><label htmlFor="electricity-days">Days used per month</label><input id="electricity-days" type="number" min="0" max="31" step="any" inputMode="decimal" value={days} onChange={(event) => setDays(event.target.value)} placeholder="30" /></div>
				<div className="calc-field"><label htmlFor="electricity-tariff">Tariff per kWh (optional)</label><input id="electricity-tariff" type="number" min="0" step="any" inputMode="decimal" value={tariff} onChange={(event) => setTariff(event.target.value)} placeholder="0.25" /></div>
			</div>
			<div className="calc-result-grid three-columns" aria-live="polite">
				<div className="calc-result"><span className="calc-label">DAILY</span><strong>{!result ? '—' : `${formatValue(result.dailyKwh)} kWh`}</strong></div>
				<div className="calc-result featured"><span className="calc-label">MONTHLY</span><strong>{!result ? '—' : `${formatValue(result.monthlyKwh)} kWh`}</strong></div>
				<div className="calc-result"><span className="calc-label">ANNUAL</span><strong>{!result ? '—' : `${formatValue(result.annualKwh)} kWh`}</strong></div>
			</div>
			{result && tariffValue !== null && <div className="calc-result-grid"><div className="calc-result"><span className="calc-label">MONTHLY ESTIMATED COST</span><strong>{formatValue(result.monthlyCost!)}</strong></div><div className="calc-result"><span className="calc-label">ANNUAL ESTIMATED COST</span><strong>{formatValue(result.annualCost!)}</strong></div></div>}
			<p className={`tool-message${complete && (!valid || error) ? ' error' : ''}`} role="status">
				{error || (complete && !valid ? 'Enter valid usage values and a valid optional tariff.' : result ? 'Estimated consumption assumes the entered wattage and usage remain constant.' : 'Enter appliance wattage and usage to estimate consumption.')}
			</p>
		</div>
	);
}
