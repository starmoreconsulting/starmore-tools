import { useState } from 'react';
import { formatValue, readFiniteNumber } from '../../engines/calculator-format';

type Category = 'length' | 'weight' | 'temperature' | 'volume' | 'area' | 'speed';

const units: Record<Category, { label: string; units: { label: string; factor?: number; toBase?: (value: number) => number; fromBase?: (value: number) => number }[] }> = {
	length: { label: 'Length', units: [
		{ label: 'Meters (m)', factor: 1 }, { label: 'Kilometers (km)', factor: 1000 },
		{ label: 'Centimeters (cm)', factor: 0.01 }, { label: 'Millimeters (mm)', factor: 0.001 },
		{ label: 'Miles (mi)', factor: 1609.344 }, { label: 'Yards (yd)', factor: 0.9144 },
		{ label: 'Feet (ft)', factor: 0.3048 }, { label: 'Inches (in)', factor: 0.0254 },
	] },
	weight: { label: 'Weight', units: [
		{ label: 'Kilograms (kg)', factor: 1 }, { label: 'Grams (g)', factor: 0.001 },
		{ label: 'Milligrams (mg)', factor: 0.000001 }, { label: 'Metric tonnes (t)', factor: 1000 },
		{ label: 'Pounds (lb)', factor: 0.45359237 }, { label: 'Ounces (oz)', factor: 0.028349523125 },
	] },
	temperature: { label: 'Temperature', units: [
		{ label: 'Celsius (°C)', toBase: (value) => value, fromBase: (value) => value },
		{ label: 'Fahrenheit (°F)', toBase: (value) => (value - 32) * 5 / 9, fromBase: (value) => value * 9 / 5 + 32 },
		{ label: 'Kelvin (K)', toBase: (value) => value - 273.15, fromBase: (value) => value + 273.15 },
	] },
	volume: { label: 'Volume', units: [
		{ label: 'Liters (L)', factor: 1 }, { label: 'Milliliters (mL)', factor: 0.001 },
		{ label: 'Cubic meters (m³)', factor: 1000 }, { label: 'US gallons (gal)', factor: 3.785411784 },
		{ label: 'US quarts (qt)', factor: 0.946352946 }, { label: 'US cups (cup)', factor: 0.2365882365 },
		{ label: 'US fluid ounces (fl oz)', factor: 0.0295735295625 },
	] },
	area: { label: 'Area', units: [
		{ label: 'Square meters (m²)', factor: 1 }, { label: 'Square kilometers (km²)', factor: 1_000_000 },
		{ label: 'Square centimeters (cm²)', factor: 0.0001 }, { label: 'Square feet (ft²)', factor: 0.09290304 },
		{ label: 'Square yards (yd²)', factor: 0.83612736 }, { label: 'Acres (ac)', factor: 4046.8564224 },
		{ label: 'Hectares (ha)', factor: 10_000 },
	] },
	speed: { label: 'Speed', units: [
		{ label: 'Meters per second (m/s)', factor: 1 }, { label: 'Kilometers per hour (km/h)', factor: 1 / 3.6 },
		{ label: 'Miles per hour (mph)', factor: 0.44704 }, { label: 'Feet per second (ft/s)', factor: 0.3048 },
		{ label: 'Knots (kn)', factor: 0.514444 },
	] },
};

const categoryKeys = Object.keys(units) as Category[];

function convert(value: number, category: Category, from: string, to: string) {
	const fromUnit = units[category].units.find((unit) => unit.label === from);
	const toUnit = units[category].units.find((unit) => unit.label === to);
	if (!fromUnit || !toUnit) return null;
	const base = fromUnit.toBase ? fromUnit.toBase(value) : value * (fromUnit.factor ?? 1);
	const converted = toUnit.fromBase ? toUnit.fromBase(base) : base / (toUnit.factor ?? 1);
	return Number.isFinite(converted) ? converted : null;
}

export default function UnitConverter() {
	const [category, setCategory] = useState<Category>('length');
	const [input, setInput] = useState('');
	const [from, setFrom] = useState(units.length.units[0].label);
	const [to, setTo] = useState(units.length.units[1].label);
	const value = readFiniteNumber(input);
	const converted = value === null ? null : convert(value, category, from, to);
	const invalidTemperature = category === 'temperature' && value !== null
		&& ((from.includes('Kelvin') && value < 0) || (from.includes('Celsius') && value < -273.15) || (from.includes('Fahrenheit') && value < -459.67));

	const updateCategory = (value: string) => {
		const nextCategory = categoryKeys.find((key) => key === value);
		if (nextCategory) changeCategory(nextCategory);
	};

	const changeCategory = (nextCategory: Category) => {
		setCategory(nextCategory);
		setFrom(units[nextCategory].units[0].label);
		setTo(units[nextCategory].units[1].label);
	};

	const swap = () => {
		setFrom(to);
		setTo(from);
	};

	return (
		<div>
			<div className="calc-fields">
				<div className="calc-field">
					<label htmlFor="unit-category">Category</label>
					<select id="unit-category" value={category} onChange={(event) => updateCategory(event.target.value)}>
						{categoryKeys.map((key) => <option key={key} value={key}>{units[key].label}</option>)}
					</select>
				</div>
				<div className="calc-field">
					<label htmlFor="unit-value">Value</label>
					<input id="unit-value" type="number" step="any" inputMode="decimal" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Enter a value" />
				</div>
				<div className="calc-field">
					<label htmlFor="unit-from">From</label>
					<select id="unit-from" value={from} onChange={(event) => setFrom(event.target.value)}>
						{units[category].units.map((unit) => <option key={unit.label} value={unit.label}>{unit.label}</option>)}
					</select>
				</div>
				<div className="calc-field">
					<label htmlFor="unit-to">To</label>
					<select id="unit-to" value={to} onChange={(event) => setTo(event.target.value)}>
						{units[category].units.map((unit) => <option key={unit.label} value={unit.label}>{unit.label}</option>)}
					</select>
				</div>
			</div>
			<div className="tool-actions">
				<button className="tool-button secondary" type="button" onClick={swap} aria-label="Swap units">⇄ Swap units</button>
			</div>
			<div className="calc-result-grid" aria-live="polite">
				<div className="calc-result featured">
					<span className="calc-label">CONVERTED VALUE</span>
					<strong>{converted === null || invalidTemperature ? '—' : formatValue(converted)}</strong>
				</div>
				<div className="calc-result">
					<span className="calc-label">UNIT</span>
					<strong className="unit-result-label">{to}</strong>
				</div>
			</div>
			<p className={`tool-message${invalidTemperature ? ' error' : ''}`} role="status">
				{invalidTemperature ? 'Temperature cannot be below absolute zero.'
					: input.trim() !== '' && value === null ? 'Enter a valid finite number.'
						: converted !== null ? 'Conversion calculated locally in your browser.'
							: 'Enter a value to convert between units.'}
			</p>
		</div>
	);
}
