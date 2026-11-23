import type { ShippingCalculatorConfig } from './ShippingEcommerceCalculator';

const dimensions = [
	{ key: 'dimensionUnit', label: 'Dimension unit', options: [{ value: 'cm', label: 'Centimetres (cm)' }, { value: 'in', label: 'Inches (in)' }] },
	{ key: 'length', label: 'Length', unit: 'dimension units', placeholder: '40' },
	{ key: 'width', label: 'Width', unit: 'dimension units', placeholder: '30' },
	{ key: 'height', label: 'Height', unit: 'dimension units', placeholder: '20' },
];
const divisor = { key: 'divisor', label: 'Volumetric divisor (cm³/kg)', unit: 'cm³/kg', placeholder: '5000' };
const nonAuthoritative = 'All rates, taxes, duties and exchange values are estimates entered by you; confirm current charges with your carrier and relevant authorities.';

export const volumetricWeightConfig: ShippingCalculatorConfig = {
	id: 'volumetric-weight',
	fields: [...dimensions, { ...divisor, defaultValue: '5000' }],
	results: [{ key: 'volumetricWeightKg', label: 'VOLUMETRIC WEIGHT', unit: 'kg', featured: true }, { key: 'volumeCm3', label: 'PARCEL VOLUME', unit: 'cm³' }],
	description: 'Dimensions are converted to centimetres before applying your editable divisor. Divisor 5,000 is a common example, not a carrier tariff; replace it with your carrier’s rule.',
};

export const actualWeightConfig: ShippingCalculatorConfig = {
	id: 'actual-weight',
	fields: [
		{ key: 'weightUnit', label: 'Weight unit', options: [{ value: 'kg', label: 'Kilograms (kg)' }, { value: 'g', label: 'Grams (g)' }, { value: 'lb', label: 'Pounds (lb)' }, { value: 'oz', label: 'Ounces (oz)' }] },
		{ key: 'weight', label: 'Weight per package', unit: 'selected unit', placeholder: '2.5' },
		{ key: 'quantity', label: 'Number of packages', placeholder: '1' },
	],
	results: [{ key: 'totalWeightKg', label: 'TOTAL ACTUAL WEIGHT', unit: 'kg', featured: true }, { key: 'weightPerPackageKg', label: 'WEIGHT PER PACKAGE', unit: 'kg' }],
	description: 'Weights are converted to kilograms using standard unit conversions; package count multiplies the per-package weight.',
};

export const chargeableWeightConfig: ShippingCalculatorConfig = {
	id: 'chargeable-weight',
	fields: [
		...dimensions,
		{ key: 'actualWeightKg', label: 'Actual shipment weight', unit: 'kg', placeholder: '8' },
		{ key: 'packages', label: 'Number of identical packages', placeholder: '1' },
		{ ...divisor, defaultValue: '5000' },
	],
	results: [{ key: 'chargeableWeightKg', label: 'CHARGEABLE WEIGHT', unit: 'kg', featured: true }, { key: 'actualWeightKg', label: 'ACTUAL SHIPMENT WEIGHT', unit: 'kg' }, { key: 'volumetricWeightKg', label: 'TOTAL VOLUMETRIC WEIGHT', unit: 'kg' }],
	description: 'Chargeable weight is the greater of actual and volumetric weight. Confirm package rounding and the divisor with your carrier.',
};

export const cbmConfig: ShippingCalculatorConfig = {
	id: 'cbm',
	fields: [...dimensions, { key: 'packages', label: 'Number of identical packages', placeholder: '1' }],
	results: [{ key: 'totalCbm', label: 'TOTAL VOLUME', unit: 'm³ (CBM)', featured: true }, { key: 'perPackageCbm', label: 'VOLUME PER PACKAGE', unit: 'm³' }],
	description: 'Each package’s dimensions are converted to metres; the result is cubic metres (CBM).',
};

export const shippingCostConfig: ShippingCalculatorConfig = {
	id: 'shipping-cost',
	fields: [
		{ key: 'weightKg', label: 'Chargeable weight', unit: 'kg', placeholder: '10' },
		{ key: 'ratePerKg', label: 'Your estimated rate per kg', placeholder: '0.00' },
		{ key: 'fixedFees', label: 'Your estimated fixed fees', defaultValue: '0', required: false },
		{ key: 'handlingPercent', label: 'Your estimated handling rate', unit: '%', defaultValue: '0', required: false },
	],
	results: [{ key: 'total', label: 'ESTIMATED SHIPPING TOTAL', featured: true }, { key: 'freight', label: 'FREIGHT ESTIMATE' }, { key: 'handlingFee', label: 'HANDLING ESTIMATE' }],
	description: `Enter all amounts in one currency; no currency conversion is applied. All rates and fees are your editable estimates, not published or guaranteed tariffs. ${nonAuthoritative}`,
};

export const chinaNigeriaShippingConfig: ShippingCalculatorConfig = {
	id: 'china-nigeria-shipping',
	fields: [
		{ key: 'weightKg', label: 'Chargeable weight', unit: 'kg', placeholder: '10' },
		{ key: 'rateCnyPerKg', label: 'Your estimated freight rate per kg', unit: 'CNY/kg', placeholder: '0.00' },
		{ key: 'chinaFeesCny', label: 'Estimated China-side fees', unit: 'CNY', defaultValue: '0', required: false },
		{ key: 'ngnPerCny', label: 'Your estimated exchange rate', unit: 'NGN per CNY', placeholder: '0.00' },
		{ key: 'nigeriaFeesNgn', label: 'Estimated Nigeria-side fees', unit: 'NGN', defaultValue: '0', required: false },
		{ key: 'taxEstimateNgn', label: 'Your estimated taxes / duties', unit: 'NGN', defaultValue: '0', required: false },
	],
	results: [{ key: 'estimatedTotalNgn', label: 'ESTIMATED TOTAL', unit: 'NGN', featured: true }, { key: 'freightNgn', label: 'FREIGHT ESTIMATE', unit: 'NGN' }, { key: 'freightCny', label: 'FREIGHT ESTIMATE', unit: 'CNY' }],
	description: `China-to-Nigeria estimates only. No freight tariff, FX rate, duty, tax or regulatory rate is supplied or authoritative; enter current quotes and assumptions yourself. ${nonAuthoritative}`,
};

export const importCostConfig: ShippingCalculatorConfig = {
	id: 'import-cost',
	fields: [
		{ key: 'unitPrice', label: 'Purchase price per unit', placeholder: '0.00' },
		{ key: 'quantity', label: 'Quantity imported', placeholder: '1' },
		{ key: 'shipping', label: 'Estimated shipping cost', defaultValue: '0', required: false },
		{ key: 'dutyPercent', label: 'Your estimated duty rate', unit: '%', defaultValue: '0', required: false },
		{ key: 'taxPercent', label: 'Your estimated tax rate', unit: '%', defaultValue: '0', required: false },
		{ key: 'otherFees', label: 'Other estimated fees', defaultValue: '0', required: false },
	],
	results: [{ key: 'estimatedImportTotal', label: 'ESTIMATED IMPORT TOTAL', featured: true }, { key: 'estimatedDuty', label: 'ESTIMATED DUTY' }, { key: 'estimatedTaxes', label: 'ESTIMATED TAX' }],
	description: `Enter all amounts in one currency; no currency conversion is applied. Duty is estimated on goods plus shipping; tax is estimated on goods, shipping and estimated duty. This is a simplified user-entered estimate, not tax or customs advice. ${nonAuthoritative}`,
};

export const landedCostConfig: ShippingCalculatorConfig = {
	id: 'landed-cost',
	fields: [
		{ key: 'goodsCost', label: 'Total goods cost', placeholder: '0.00' },
		{ key: 'quantity', label: 'Units in shipment', placeholder: '1' },
		{ key: 'shipping', label: 'Estimated shipping', defaultValue: '0', required: false },
		{ key: 'insurance', label: 'Estimated insurance', defaultValue: '0', required: false },
		{ key: 'dutiesTaxes', label: 'Estimated duties and taxes', defaultValue: '0', required: false },
		{ key: 'otherFees', label: 'Other estimated fees', defaultValue: '0', required: false },
	],
	results: [{ key: 'landedTotal', label: 'ESTIMATED LANDED TOTAL', featured: true }, { key: 'landedPerUnit', label: 'ESTIMATED LANDED COST / UNIT' }],
	description: `Enter all amounts in one currency; no currency conversion is applied. Adds your entered goods, shipping, insurance, duties/taxes and fees. All charges are assumptions you provide, not authoritative rates. ${nonAuthoritative}`,
};

export const productPricingConfig: ShippingCalculatorConfig = {
	id: 'product-pricing',
	fields: [
		{ key: 'unitCost', label: 'Product cost per unit', placeholder: '0.00' },
		{ key: 'unitShipping', label: 'Shipping per unit', defaultValue: '0', required: false },
		{ key: 'otherUnitCost', label: 'Other cost per unit', defaultValue: '0', required: false },
		{ key: 'targetMargin', label: 'Target gross margin', unit: '%', placeholder: '30' },
	],
	results: [{ key: 'suggestedPrice', label: 'SUGGESTED SELLING PRICE', featured: true }, { key: 'totalUnitCost', label: 'TOTAL UNIT COST' }, { key: 'profitPerUnit', label: 'GROSS PROFIT / UNIT' }],
	description: 'Use the same currency for all unit costs and the suggested price; no conversion is applied. Suggested price is total unit cost ÷ (1 − target margin), excluding any fees not entered.',
};

export const ecommerceProfitConfig: ShippingCalculatorConfig = {
	id: 'ecommerce-profit',
	fields: [
		{ key: 'sellingPrice', label: 'Selling price', placeholder: '0.00' },
		{ key: 'productCost', label: 'Product cost', placeholder: '0.00' },
		{ key: 'shippingCost', label: 'Shipping cost', defaultValue: '0', required: false },
		{ key: 'platformFeePercent', label: 'Estimated platform fee', unit: '%', defaultValue: '0', required: false },
		{ key: 'marketingCost', label: 'Marketing cost', defaultValue: '0', required: false },
		{ key: 'otherCost', label: 'Other costs', defaultValue: '0', required: false },
	],
	results: [{ key: 'profit', label: 'ESTIMATED PROFIT', featured: true }, { key: 'totalCost', label: 'TOTAL COST INCLUDING PLATFORM FEE' }, { key: 'profitMarginPercent', label: 'PROFIT MARGIN', unit: '%' }],
	description: 'Use the same currency for all amounts; no conversion is applied. Profit is selling price minus entered product, shipping, marketing, other costs and estimated platform fee.',
};

export const wholesalePricingConfig: ShippingCalculatorConfig = {
	id: 'wholesale-pricing',
	fields: [
		{ key: 'unitCost', label: 'Unit cost', placeholder: '0.00' },
		{ key: 'targetMargin', label: 'Your target wholesale margin', unit: '%', placeholder: '20' },
		{ key: 'orderQuantity', label: 'Order quantity', placeholder: '1' },
		{ key: 'retailerMargin', label: 'Assumed retailer margin', unit: '%', placeholder: '30' },
	],
	results: [{ key: 'wholesalePrice', label: 'SUGGESTED WHOLESALE PRICE / UNIT', featured: true }, { key: 'orderTotal', label: 'WHOLESALE ORDER TOTAL' }, { key: 'suggestedRetailPrice', label: 'SUGGESTED RETAIL PRICE' }],
	description: 'Use the same currency for all prices and costs; no conversion is applied. Prices use user-entered gross-margin assumptions and do not include costs missing from unit cost.',
};

export const packagingSizeConfig: ShippingCalculatorConfig = {
	id: 'packaging-size',
	fields: [
		...dimensions,
		{ key: 'padding', label: 'Padding on each side', unit: 'dimension units', defaultValue: '0' },
		{ ...divisor, defaultValue: '5000' },
	],
	results: [
		{ key: 'boxCbm', label: 'ESTIMATED BOX VOLUME', unit: 'm³', featured: true },
		{ key: 'volumetricWeightKg', label: 'VOLUMETRIC WEIGHT', unit: 'kg' },
		{ key: 'boxLengthCm', label: 'BOX LENGTH', unit: 'cm' },
		{ key: 'boxWidthCm', label: 'BOX WIDTH', unit: 'cm' },
		{ key: 'boxHeightCm', label: 'BOX HEIGHT', unit: 'cm' },
	],
	description: 'Adds the entered padding on each side and converts box volume to CBM. Volumetric divisor is an editable example; check your carrier’s rule.',
};

export const bulkOrderConfig: ShippingCalculatorConfig = {
	id: 'bulk-order',
	fields: [
		{ key: 'unitPrice', label: 'Price per unit', placeholder: '0.00' },
		{ key: 'quantity', label: 'Order quantity', placeholder: '1' },
		{ key: 'discountPercent', label: 'Your discount rate', unit: '%', defaultValue: '0', required: false },
		{ key: 'taxPercent', label: 'Your estimated tax rate', unit: '%', defaultValue: '0', required: false },
		{ key: 'shipping', label: 'Estimated shipping', defaultValue: '0', required: false },
	],
	results: [{ key: 'total', label: 'ESTIMATED ORDER TOTAL', featured: true }, { key: 'discountAmount', label: 'DISCOUNT AMOUNT' }, { key: 'effectiveUnitPrice', label: 'EFFECTIVE COST / UNIT' }],
	description: `Enter all amounts in one currency; no currency conversion is applied. Tax and shipping are user-entered estimates. Confirm applicable rates and charges; this result is not tax or regulatory advice. ${nonAuthoritative}`,
};
