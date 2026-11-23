export type ShippingToolId =
	| 'volumetric-weight'
	| 'actual-weight'
	| 'chargeable-weight'
	| 'cbm'
	| 'shipping-cost'
	| 'china-nigeria-shipping'
	| 'import-cost'
	| 'landed-cost'
	| 'product-pricing'
	| 'ecommerce-profit'
	| 'wholesale-pricing'
	| 'packaging-size'
	| 'bulk-order';

export type ShippingToolValues = Record<string, number | string>;

const INCH_TO_CM = 2.54;
const CUBIC_INCH_TO_CUBIC_CM = INCH_TO_CM ** 3;
const KG_PER_UNIT: Record<string, number> = {
	kg: 1,
	g: 0.001,
	lb: 0.45359237,
	oz: 0.028349523125,
};

function numberValue(values: ShippingToolValues, key: string, label = key): number {
	const value = values[key];
	if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
		throw new Error(`${label} must be a non-negative number.`);
	}
	return value;
}

function positiveValue(values: ShippingToolValues, key: string, label = key): number {
	const value = numberValue(values, key, label);
	if (value <= 0) throw new Error(`${label} must be greater than zero.`);
	return value;
}

function percent(values: ShippingToolValues, key: string, label = key): number {
	const value = numberValue(values, key, label);
	if (value > 100) throw new Error(`${label} must be between 0 and 100%.`);
	return value / 100;
}

function dimensionCm(value: number, unit: string): number {
	if (!Number.isFinite(value) || value <= 0) throw new Error('Dimensions must be greater than zero.');
	if (unit === 'cm') return value;
	if (unit === 'in') return value * INCH_TO_CM;
	throw new Error('Choose centimetres or inches for dimensions.');
}

function paddingCm(value: number, unit: string): number {
	if (!Number.isFinite(value) || value < 0) throw new Error('Padding must be a non-negative number.');
	if (unit === 'cm') return value;
	if (unit === 'in') return value * INCH_TO_CM;
	throw new Error('Choose centimetres or inches for dimensions.');
}

function volumeCm3(values: ShippingToolValues, prefix = ''): number {
	const unit = String(values[`${prefix}dimensionUnit`] ?? '');
	const length = dimensionCm(positiveValue(values, `${prefix}length`, 'Length'), unit);
	const width = dimensionCm(positiveValue(values, `${prefix}width`, 'Width'), unit);
	const height = dimensionCm(positiveValue(values, `${prefix}height`, 'Height'), unit);
	return length * width * height;
}

function safeResult(result: Record<string, number>): Record<string, number> {
	for (const value of Object.values(result)) {
		if (!Number.isFinite(value)) throw new Error('The result is too large to calculate safely.');
	}
	return result;
}

export function calculateShippingTool(id: ShippingToolId, values: ShippingToolValues): Record<string, number> {
	switch (id) {
		case 'volumetric-weight': {
			const volume = volumeCm3(values);
			const divisor = positiveValue(values, 'divisor', 'Volumetric divisor');
			return safeResult({ volumeCm3: volume, volumetricWeightKg: volume / divisor });
		}
		case 'actual-weight': {
			const weight = numberValue(values, 'weight', 'Weight');
			const quantity = positiveValue(values, 'quantity', 'Package count');
			const unit = String(values.weightUnit ?? '');
			const factor = KG_PER_UNIT[unit];
			if (!factor) throw new Error('Choose a supported weight unit.');
			return safeResult({ totalWeightKg: weight * factor * quantity, weightPerPackageKg: weight * factor });
		}
		case 'chargeable-weight': {
			const actualWeightKg = numberValue(values, 'actualWeightKg', 'Actual shipment weight');
			const packages = positiveValue(values, 'packages', 'Package count');
			const divisor = positiveValue(values, 'divisor', 'Volumetric divisor');
			const volumetricWeightKg = volumeCm3(values) / divisor * packages;
			return safeResult({ actualWeightKg, volumetricWeightKg, chargeableWeightKg: Math.max(actualWeightKg, volumetricWeightKg) });
		}
		case 'cbm': {
			const packages = positiveValue(values, 'packages', 'Package count');
			const totalCbm = volumeCm3(values) / 1_000_000 * packages;
			return safeResult({ perPackageCbm: totalCbm / packages, totalCbm });
		}
		case 'shipping-cost': {
			const weight = positiveValue(values, 'weightKg', 'Chargeable weight');
			const rate = numberValue(values, 'ratePerKg', 'Rate per kilogram');
			const fixed = numberValue(values, 'fixedFees', 'Fixed fees');
			const handling = percent(values, 'handlingPercent', 'Handling rate');
			const freight = weight * rate;
			const handlingFee = freight * handling;
			return safeResult({ freight, handlingFee, fixedFees: fixed, total: freight + handlingFee + fixed });
		}
		case 'china-nigeria-shipping': {
			const weight = positiveValue(values, 'weightKg', 'Chargeable weight');
			const rateCny = numberValue(values, 'rateCnyPerKg', 'Estimated rate per kilogram');
			const chinaFeesCny = numberValue(values, 'chinaFeesCny', 'Estimated China-side fees');
			const exchangeRate = positiveValue(values, 'ngnPerCny', 'Estimated NGN per CNY exchange rate');
			const nigeriaFees = numberValue(values, 'nigeriaFeesNgn', 'Estimated Nigeria-side fees');
			const taxEstimate = numberValue(values, 'taxEstimateNgn', 'Estimated taxes and duties');
			const freightCny = weight * rateCny + chinaFeesCny;
			const freightNgn = freightCny * exchangeRate;
			return safeResult({ freightCny, freightNgn, nigeriaFeesNgn: nigeriaFees, taxEstimateNgn: taxEstimate, estimatedTotalNgn: freightNgn + nigeriaFees + taxEstimate });
		}
		case 'import-cost': {
			const goods = numberValue(values, 'unitPrice', 'Unit purchase price') * positiveValue(values, 'quantity', 'Quantity');
			const shipping = numberValue(values, 'shipping', 'Shipping estimate');
			const duty = (goods + shipping) * percent(values, 'dutyPercent', 'Estimated duty rate');
			const taxes = (goods + shipping + duty) * percent(values, 'taxPercent', 'Estimated tax rate');
			const fees = numberValue(values, 'otherFees', 'Other estimated fees');
			return safeResult({ goods, shipping, estimatedDuty: duty, estimatedTaxes: taxes, otherFees: fees, estimatedImportTotal: goods + shipping + duty + taxes + fees });
		}
		case 'landed-cost': {
			const quantity = positiveValue(values, 'quantity', 'Quantity');
			const goods = numberValue(values, 'goodsCost', 'Goods cost');
			const shipping = numberValue(values, 'shipping', 'Shipping estimate');
			const insurance = numberValue(values, 'insurance', 'Insurance estimate');
			const dutiesTaxes = numberValue(values, 'dutiesTaxes', 'Estimated duties and taxes');
			const fees = numberValue(values, 'otherFees', 'Other estimated fees');
			const total = goods + shipping + insurance + dutiesTaxes + fees;
			return safeResult({ landedTotal: total, landedPerUnit: total / quantity });
		}
		case 'product-pricing': {
			const cost = numberValue(values, 'unitCost', 'Unit cost') + numberValue(values, 'unitShipping', 'Unit shipping') + numberValue(values, 'otherUnitCost', 'Other unit costs');
			const margin = percent(values, 'targetMargin', 'Target margin');
			if (margin >= 1) throw new Error('Target margin must be less than 100%.');
			const suggestedPrice = cost / (1 - margin);
			return safeResult({ totalUnitCost: cost, suggestedPrice, profitPerUnit: suggestedPrice - cost, achievedMarginPercent: suggestedPrice === 0 ? 0 : (suggestedPrice - cost) / suggestedPrice * 100 });
		}
		case 'ecommerce-profit': {
			const price = numberValue(values, 'sellingPrice', 'Selling price');
			const product = numberValue(values, 'productCost', 'Product cost');
			const shipping = numberValue(values, 'shippingCost', 'Shipping cost');
			const marketing = numberValue(values, 'marketingCost', 'Marketing cost');
			const other = numberValue(values, 'otherCost', 'Other costs');
			const feePercent = percent(values, 'platformFeePercent', 'Platform fee');
			const platformFee = price * feePercent;
			const totalCost = product + shipping + marketing + other + platformFee;
			const profit = price - totalCost;
			return safeResult({ platformFee, totalCost, profit, profitMarginPercent: price === 0 ? 0 : profit / price * 100 });
		}
		case 'wholesale-pricing': {
			const cost = numberValue(values, 'unitCost', 'Unit cost');
			const margin = percent(values, 'targetMargin', 'Target wholesale margin');
			if (margin >= 1) throw new Error('Target wholesale margin must be less than 100%.');
			const quantity = positiveValue(values, 'orderQuantity', 'Order quantity');
			const retailMargin = percent(values, 'retailerMargin', 'Retailer margin');
			if (retailMargin >= 1) throw new Error('Retailer margin must be less than 100%.');
			const wholesalePrice = cost / (1 - margin);
			const suggestedRetail = wholesalePrice / (1 - retailMargin);
			return safeResult({ wholesalePrice, orderTotal: wholesalePrice * quantity, suggestedRetailPrice: suggestedRetail, grossProfitPerUnit: wholesalePrice - cost });
		}
		case 'packaging-size': {
			const padding = numberValue(values, 'padding', 'Padding per side');
			const unit = String(values.dimensionUnit ?? '');
			const paddingCmValue = paddingCm(padding, unit) * 2;
			const length = dimensionCm(positiveValue(values, 'length', 'Product length'), unit) + paddingCmValue;
			const width = dimensionCm(positiveValue(values, 'width', 'Product width'), unit) + paddingCmValue;
			const height = dimensionCm(positiveValue(values, 'height', 'Product height'), unit) + paddingCmValue;
			const divisor = positiveValue(values, 'divisor', 'Volumetric divisor');
			const boxVolume = length * width * height;
			return safeResult({ boxLengthCm: length, boxWidthCm: width, boxHeightCm: height, boxCbm: boxVolume / 1_000_000, volumetricWeightKg: boxVolume / divisor });
		}
		case 'bulk-order': {
			const unitPrice = numberValue(values, 'unitPrice', 'Unit price');
			const quantity = positiveValue(values, 'quantity', 'Quantity');
			const discount = percent(values, 'discountPercent', 'Discount');
			const tax = percent(values, 'taxPercent', 'Estimated tax');
			const shipping = numberValue(values, 'shipping', 'Shipping estimate');
			const subtotal = unitPrice * quantity;
			const discountAmount = subtotal * discount;
			const taxableAmount = subtotal - discountAmount;
			const estimatedTax = taxableAmount * tax;
			const total = taxableAmount + estimatedTax + shipping;
			return safeResult({ subtotal, discountAmount, estimatedTax, shipping, total, effectiveUnitPrice: total / quantity });
		}
	}
}
