import { useState } from 'react';
import { formatValue, readFiniteNumber } from '../../engines/calculator-format';
import { calculateFuelConsumption } from '../../engines/calculators/fuel-consumption-calculator';

export default function FuelConsumptionCalculator() {
	const [distance, setDistance] = useState('');
	const [fuel, setFuel] = useState('');
	const [price, setPrice] = useState('');
	const distanceValue = readFiniteNumber(distance);
	const fuelValue = readFiniteNumber(fuel);
	const priceValue = price.trim() === '' ? null : readFiniteNumber(price);
	const complete = distance.trim() !== '' && fuel.trim() !== '';
	const valid = complete && distanceValue !== null && fuelValue !== null
		&& (price.trim() === '' || priceValue !== null);

	let result = null;
	let error = '';
	if (valid) {
		try { result = calculateFuelConsumption(distanceValue!, fuelValue!, priceValue); }
		catch (cause) { error = cause instanceof Error ? cause.message : 'Unable to calculate this result.'; }
	}

	return (
		<div>
			<div className="calc-fields">
				<div className="calc-field"><label htmlFor="fuel-distance">Distance travelled</label><div className="calc-input-suffix"><input id="fuel-distance" type="number" min="0" step="any" inputMode="decimal" value={distance} onChange={(event) => setDistance(event.target.value)} placeholder="500" /><span>km</span></div></div>
				<div className="calc-field"><label htmlFor="fuel-used">Fuel used</label><div className="calc-input-suffix"><input id="fuel-used" type="number" min="0" step="any" inputMode="decimal" value={fuel} onChange={(event) => setFuel(event.target.value)} placeholder="40" /><span>litres</span></div></div>
				<div className="calc-field"><label htmlFor="fuel-price">Fuel price per litre (optional)</label><input id="fuel-price" type="number" min="0" step="any" inputMode="decimal" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="1.50" /></div>
			</div>
			<div className="calc-result-grid three-columns" aria-live="polite">
				<div className="calc-result featured"><span className="calc-label">LITRES / 100 KM</span><strong>{!result ? '—' : formatValue(result.litresPer100Km)}</strong></div>
				<div className="calc-result"><span className="calc-label">KM / LITRE</span><strong>{!result ? '—' : formatValue(result.kilometresPerLitre)}</strong></div>
				<div className="calc-result"><span className="calc-label">MPG (US)</span><strong>{!result ? '—' : formatValue(result.milesPerGallon)}</strong></div>
			</div>
			{result && result.costPerDistance !== null && <div className="calc-result-grid"><div className="calc-result"><span className="calc-label">ESTIMATED FUEL COST</span><strong>{formatValue(result.costPerDistance)}</strong></div></div>}
			<p className={`tool-message${complete && (!valid || error) ? ' error' : ''}`} role="status">
				{error || (complete && !valid ? 'Enter a positive distance, non-negative fuel and a valid optional price.' : result ? 'Lower litres per 100 km means better fuel efficiency.' : 'Enter distance and fuel used to estimate consumption.')}
			</p>
		</div>
	);
}
