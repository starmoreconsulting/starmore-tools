import { useState } from 'react';
import { formatValue, readFiniteNumber } from '../../engines/calculator-format';
import { calculateShippingTool, type ShippingToolId } from '../../engines/shipping-ecommerce';

export interface ShippingField {
	key: string;
	label: string;
	unit?: string;
	placeholder?: string;
	defaultValue?: string;
	required?: boolean;
	options?: { value: string; label: string }[];
}

export interface ShippingResult {
	key: string;
	label: string;
	unit?: string;
	featured?: boolean;
}

export interface ShippingCalculatorConfig {
	id: ShippingToolId;
	fields: ShippingField[];
	results: ShippingResult[];
	description: string;
}

export default function ShippingEcommerceCalculator({ config }: { config: ShippingCalculatorConfig }) {
	const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(
		config.fields.map((field) => [field.key, field.defaultValue ?? (field.options ? field.options[0]?.value ?? '' : '')]),
	));
	const required = config.fields.filter((field) => field.required !== false && !field.options);
	const complete = required.every((field) => values[field.key]?.trim() !== '');
	let valid = complete;
	const parsed: Record<string, number | string> = {};
	for (const field of config.fields) {
		const raw = values[field.key] ?? '';
		if (field.options) {
			parsed[field.key] = raw;
		} else if (raw.trim() === '' && field.required === false) {
			parsed[field.key] = 0;
		} else {
			const number = readFiniteNumber(raw);
			if (number === null || number < 0) valid = false;
			else parsed[field.key] = number;
		}
	}
	let result: Record<string, number> | null = null;
	let error = '';
	if (complete && valid) {
		try {
			result = calculateShippingTool(config.id, parsed);
		} catch (cause) {
			error = cause instanceof Error ? cause.message : 'Unable to calculate this estimate.';
		}
	}
	const invalid = complete && (!valid || Boolean(error));
	const update = (key: string, value: string) => setValues((current) => ({ ...current, [key]: value }));

	return (
		<div>
			<div className="calc-fields calc-fields-three">
				{config.fields.map((field) => (
					<div className="calc-field" key={field.key}>
						<label htmlFor={`shipping-${config.id}-${field.key}`}>{field.label}</label>
						{field.options ? (
							<select id={`shipping-${config.id}-${field.key}`} value={values[field.key]} onChange={(event) => update(field.key, event.target.value)}>
								{field.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
							</select>
						) : (
							<div className={field.unit ? 'calc-input-suffix' : undefined}>
								<input id={`shipping-${config.id}-${field.key}`} type="number" min="0" step="any" inputMode="decimal" value={values[field.key]} onChange={(event) => update(field.key, event.target.value)} placeholder={field.placeholder} />
								{field.unit && <span>{field.unit === 'dimension units' ? values.dimensionUnit : field.unit}</span>}
							</div>
						)}
					</div>
				))}
			</div>
			<div className={`calc-result-grid${config.results.length >= 3 ? ' three-columns' : ''}`} aria-live="polite">
				{config.results.map((item, index) => (
					<div className={`calc-result${item.featured || index === 0 ? ' featured' : ''}`} key={item.key}>
						<span className="calc-label">{item.label}</span>
						<strong>{!result ? '—' : `${formatValue(result[item.key] ?? 0)}${item.unit ? ` ${item.unit}` : ''}`}</strong>
					</div>
				))}
			</div>
			<p className="tool-message">{config.description}</p>
			<p className={`tool-message${invalid ? ' error' : ''}`} role="status">
				{error || (invalid ? 'Enter valid non-negative values and check that required dimensions, quantities and rates are greater than zero.' : result ? 'Estimate calculated using your entered values and assumptions.' : 'Enter the required values to calculate an estimate.')}
			</p>
		</div>
	);
}
