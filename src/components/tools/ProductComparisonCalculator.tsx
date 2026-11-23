import { useState } from 'react';
import { formatValue, readFiniteNumber } from '../../engines/calculator-format';
import {
	compareProductAttributes,
	compareProducts,
	type ProductAttribute,
	type ProductComparison,
} from '../../engines/calculators/product-comparison-calculator';

interface AttributeRow extends ProductAttribute {
	id: number;
}

function formatUnitPrice(value: number): string {
	return new Intl.NumberFormat(undefined, {
		minimumFractionDigits: 2,
		maximumFractionDigits: 8,
	}).format(value);
}

export default function ProductComparisonCalculator() {
	const [firstPrice, setFirstPrice] = useState('');
	const [firstQuantity, setFirstQuantity] = useState('');
	const [firstUnit, setFirstUnit] = useState('');
	const [secondPrice, setSecondPrice] = useState('');
	const [secondQuantity, setSecondQuantity] = useState('');
	const [secondUnit, setSecondUnit] = useState('');
	const [attributes, setAttributes] = useState<AttributeRow[]>([]);
	const [nextAttributeId, setNextAttributeId] = useState(0);

	const firstPriceNumber = readFiniteNumber(firstPrice);
	const firstQuantityNumber = readFiniteNumber(firstQuantity);
	const secondPriceNumber = readFiniteNumber(secondPrice);
	const secondQuantityNumber = readFiniteNumber(secondQuantity);
	const numbersComplete = [firstPrice, firstQuantity, secondPrice, secondQuantity]
		.every((value) => value.trim() !== '');
	let comparison: ProductComparison | null = null;
	let errorMessage = '';
	if (numbersComplete && firstPriceNumber !== null && firstQuantityNumber !== null
		&& secondPriceNumber !== null && secondQuantityNumber !== null) {
		try {
			comparison = compareProducts(
				{ price: firstPriceNumber, quantity: firstQuantityNumber, unit: firstUnit },
				{ price: secondPriceNumber, quantity: secondQuantityNumber, unit: secondUnit },
				attributes,
			);
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Check the values and try again.';
		}
	}

	const betterValue = comparison?.unitPrice.betterValue === 'same'
		? 'Both products have the same price per unit.'
		: comparison?.unitPrice.betterValue === 'first'
			? 'Product 1 has the lower price per unit.'
			: comparison?.unitPrice.betterValue === 'second'
				? 'Product 2 has the lower price per unit.'
				: '';
	let attributeErrorMessage = '';
	const attributeResults = attributes.map((attribute) => {
		try {
			return compareProductAttributes([attribute])[0] ?? null;
		} catch (error) {
			attributeErrorMessage = error instanceof Error ? error.message : 'Check the attribute values and try again.';
			return null;
		}
	});

	function addAttribute() {
		if (attributes.length >= 12) return;
		setAttributes((current) => [...current, {
			id: nextAttributeId,
			name: '',
			firstValue: '',
			secondValue: '',
		}]);
		setNextAttributeId((current) => current + 1);
	}

	function updateAttribute(id: number, field: keyof ProductAttribute, value: string) {
		setAttributes((current) => current.map((attribute) => (
			attribute.id === id ? { ...attribute, [field]: value } : attribute
		)));
	}

	function removeAttribute(id: number) {
		setAttributes((current) => current.filter((attribute) => attribute.id !== id));
	}

	return (
		<div>
			<p>Enter prices in the same currency and quantities in the same unit. The unit price is calculated as price ÷ quantity.</p>
			<div className="calc-fields">
				<div className="calc-field">
					<label htmlFor="product-comparison-first-price">Product 1 price</label>
					<input id="product-comparison-first-price" type="number" min="0" step="any" inputMode="decimal" value={firstPrice} onChange={(event) => setFirstPrice(event.target.value)} placeholder="4.00" />
				</div>
				<div className="calc-field">
					<label htmlFor="product-comparison-first-quantity">Product 1 quantity</label>
					<input id="product-comparison-first-quantity" type="number" min="0" step="any" inputMode="decimal" value={firstQuantity} onChange={(event) => setFirstQuantity(event.target.value)} placeholder="500" />
				</div>
				<div className="calc-field">
					<label htmlFor="product-comparison-first-unit">Product 1 unit</label>
					<input id="product-comparison-first-unit" type="text" maxLength={24} value={firstUnit} onChange={(event) => setFirstUnit(event.target.value)} placeholder="g, ml, count…" />
				</div>
				<div className="calc-field">
					<label htmlFor="product-comparison-second-price">Product 2 price</label>
					<input id="product-comparison-second-price" type="number" min="0" step="any" inputMode="decimal" value={secondPrice} onChange={(event) => setSecondPrice(event.target.value)} placeholder="7.00" />
				</div>
				<div className="calc-field">
					<label htmlFor="product-comparison-second-quantity">Product 2 quantity</label>
					<input id="product-comparison-second-quantity" type="number" min="0" step="any" inputMode="decimal" value={secondQuantity} onChange={(event) => setSecondQuantity(event.target.value)} placeholder="1000" />
				</div>
				<div className="calc-field">
					<label htmlFor="product-comparison-second-unit">Product 2 unit</label>
					<input id="product-comparison-second-unit" type="text" maxLength={24} value={secondUnit} onChange={(event) => setSecondUnit(event.target.value)} placeholder="g, ml, count…" />
				</div>
			</div>

			<section aria-labelledby="product-comparison-attributes-title">
				<h3 id="product-comparison-attributes-title">Compare other attributes</h3>
				<p>Add your own criteria; comparisons use only the values you enter.</p>
				{attributes.map((attribute, index) => {
					const result = attributeResults[index];
					return (
						<div className="calc-fields" key={attribute.id}>
							<div className="calc-field">
								<label htmlFor={`product-comparison-criterion-${attribute.id}`}>Criterion</label>
								<input id={`product-comparison-criterion-${attribute.id}`} type="text" maxLength={80} value={attribute.name} onChange={(event) => updateAttribute(attribute.id, 'name', event.target.value)} placeholder="e.g. Material" />
							</div>
							<div className="calc-field">
								<label htmlFor={`product-comparison-first-attribute-${attribute.id}`}>Product 1 value</label>
								<input id={`product-comparison-first-attribute-${attribute.id}`} type="text" maxLength={120} value={attribute.firstValue} onChange={(event) => updateAttribute(attribute.id, 'firstValue', event.target.value)} placeholder="Enter a value" />
							</div>
							<div className="calc-field">
								<label htmlFor={`product-comparison-second-attribute-${attribute.id}`}>Product 2 value</label>
								<input id={`product-comparison-second-attribute-${attribute.id}`} type="text" maxLength={120} value={attribute.secondValue} onChange={(event) => updateAttribute(attribute.id, 'secondValue', event.target.value)} placeholder="Enter a value" />
							</div>
							<div className="calc-field">
								<span className="calc-label">Comparison</span>
								<strong>{result?.result === 'same' ? 'Same' : result?.result === 'different' ? 'Different' : 'Not enough information'}</strong>
							</div>
							<button type="button" onClick={() => removeAttribute(attribute.id)} aria-label={`Remove ${attribute.name || 'attribute'} comparison`}>Remove</button>
						</div>
					);
				})}
				<button type="button" onClick={addAttribute} disabled={attributes.length >= 12}>Add comparison attribute</button>
			</section>

			<div className="calc-result-grid" aria-live="polite">
				<div className="calc-result">
					<span className="calc-label">PRODUCT 1 PRICE ÷ QUANTITY</span>
					<strong>{comparison ? `${formatUnitPrice(comparison.unitPrice.firstUnitPrice)} / ${comparison.unit}` : '—'}</strong>
				</div>
				<div className="calc-result">
					<span className="calc-label">PRODUCT 2 PRICE ÷ QUANTITY</span>
					<strong>{comparison ? `${formatUnitPrice(comparison.unitPrice.secondUnitPrice)} / ${comparison.unit}` : '—'}</strong>
				</div>
				<div className="calc-result featured">
					<span className="calc-label">DIFFERENCE PER {comparison?.unit.toLocaleUpperCase() || 'UNIT'}</span>
					<strong>{comparison ? formatUnitPrice(comparison.unitPrice.differencePerUnit) : '—'}</strong>
				</div>
				<div className="calc-result">
					<span className="calc-label">LOWER PRICE SAVING</span>
					<strong>{comparison ? `${formatValue(comparison.unitPrice.savingsPercent)}%` : '—'}</strong>
				</div>
			</div>
			<p className={`tool-message${errorMessage || attributeErrorMessage ? ' error' : ''}`} role="status">
				{errorMessage || attributeErrorMessage || betterValue || 'Enter prices, quantities, and matching units to compare value.'}
			</p>
		</div>
	);
}
