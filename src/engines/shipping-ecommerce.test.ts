import { describe, expect, it } from 'vitest';
import { calculateShippingTool } from './shipping-ecommerce';

describe('shipping and ecommerce calculators', () => {
	it('converts centimetres and inches to volumetric weight with an editable divisor', () => {
		const cm = calculateShippingTool('volumetric-weight', { dimensionUnit: 'cm', length: 40, width: 30, height: 20, divisor: 5000 });
		const inches = calculateShippingTool('volumetric-weight', { dimensionUnit: 'in', length: 40 / 2.54, width: 30 / 2.54, height: 20 / 2.54, divisor: 5000 });
		expect(cm.volumetricWeightKg).toBeCloseTo(4.8);
		expect(inches.volumetricWeightKg).toBeCloseTo(4.8);
		expect(cm.volumeCm3).toBeCloseTo(24000);
	});

	it('converts weight units and package counts to total kilograms', () => {
		expect(calculateShippingTool('actual-weight', { weightUnit: 'lb', weight: 10, quantity: 2 }).totalWeightKg).toBeCloseTo(9.0718474);
		expect(calculateShippingTool('actual-weight', { weightUnit: 'g', weight: 500, quantity: 4 }).totalWeightKg).toBe(2);
	});

	it('chooses the larger of actual and total volumetric shipment weight', () => {
		const result = calculateShippingTool('chargeable-weight', {
			dimensionUnit: 'cm', length: 50, width: 40, height: 30, actualWeightKg: 20, packages: 2, divisor: 5000,
		});
		expect(result.volumetricWeightKg).toBe(24);
		expect(result.chargeableWeightKg).toBe(24);
	});

	it('converts parcel dimensions into cubic metres and counts packages', () => {
		expect(calculateShippingTool('cbm', { dimensionUnit: 'cm', length: 100, width: 50, height: 40, packages: 3 }).totalCbm).toBeCloseTo(0.6);
		expect(calculateShippingTool('cbm', { dimensionUnit: 'in', length: 39.37007874, width: 19.68503937, height: 15.7480315, packages: 1 }).totalCbm).toBeCloseTo(0.2, 6);
	});

	it('calculates freight, handling and user-entered fixed fees', () => {
		expect(calculateShippingTool('shipping-cost', { weightKg: 10, ratePerKg: 4, fixedFees: 3, handlingPercent: 10 })).toEqual({
			freight: 40, handlingFee: 4, fixedFees: 3, total: 47,
		});
	});

	it('uses only user-provided China-to-Nigeria estimates and applies the entered FX rate', () => {
		const result = calculateShippingTool('china-nigeria-shipping', {
			weightKg: 10, rateCnyPerKg: 8, chinaFeesCny: 5, ngnPerCny: 200, nigeriaFeesNgn: 1000, taxEstimateNgn: 500,
		});
		expect(result.freightCny).toBe(85);
		expect(result.freightNgn).toBe(17000);
		expect(result.estimatedTotalNgn).toBe(18500);
	});

	it('estimates import duty and tax using the documented sequential bases', () => {
		const result = calculateShippingTool('import-cost', {
			unitPrice: 100, quantity: 2, shipping: 20, dutyPercent: 10, taxPercent: 5, otherFees: 3,
		});
		expect(result.estimatedDuty).toBe(22);
		expect(result.estimatedTaxes).toBeCloseTo(12.1);
		expect(result.estimatedImportTotal).toBeCloseTo(257.1);
	});

	it('calculates landed cost per unit from entered amounts', () => {
		const result = calculateShippingTool('landed-cost', { goodsCost: 200, quantity: 4, shipping: 20, insurance: 4, dutiesTaxes: 16, otherFees: 8 });
		expect(result.landedTotal).toBe(248);
		expect(result.landedPerUnit).toBe(62);
	});

	it('prices a product for a target gross margin', () => {
		const result = calculateShippingTool('product-pricing', { unitCost: 70, unitShipping: 10, otherUnitCost: 0, targetMargin: 20 });
		expect(result.suggestedPrice).toBe(100);
		expect(result.profitPerUnit).toBe(20);
	});

	it('subtracts platform fees and operating costs from ecommerce sales', () => {
		const result = calculateShippingTool('ecommerce-profit', {
			sellingPrice: 100, productCost: 40, shippingCost: 10, platformFeePercent: 5, marketingCost: 10, otherCost: 5,
		});
		expect(result.platformFee).toBe(5);
		expect(result.profit).toBe(30);
		expect(result.profitMarginPercent).toBe(30);
	});

	it('calculates wholesale price, order value and assumed recommended retail price', () => {
		const result = calculateShippingTool('wholesale-pricing', { unitCost: 60, targetMargin: 25, orderQuantity: 10, retailerMargin: 20 });
		expect(result.wholesalePrice).toBe(80);
		expect(result.orderTotal).toBe(800);
		expect(result.suggestedRetailPrice).toBe(100);
	});

	it('adds padding in the selected unit and converts box volume to CBM', () => {
		const result = calculateShippingTool('packaging-size', {
			dimensionUnit: 'in', length: 10, width: 8, height: 6, padding: 1, divisor: 5000,
		});
		expect(result.boxLengthCm).toBeCloseTo(30.48);
		expect(result.boxWidthCm).toBeCloseTo(25.4);
		expect(result.boxHeightCm).toBeCloseTo(20.32);
		expect(result.boxCbm).toBeCloseTo(0.01573158, 7);
	});

	it('calculates bulk discount, estimated tax and the effective per-unit total', () => {
		const result = calculateShippingTool('bulk-order', { unitPrice: 10, quantity: 10, discountPercent: 10, taxPercent: 5, shipping: 4 });
		expect(result.subtotal).toBe(100);
		expect(result.discountAmount).toBe(10);
		expect(result.estimatedTax).toBe(4.5);
		expect(result.total).toBe(98.5);
		expect(result.effectiveUnitPrice).toBe(9.85);
	});

	it('rejects invalid units, negative values, zero dimensions and out-of-range assumptions', () => {
		expect(() => calculateShippingTool('actual-weight', { weightUnit: 'stone', weight: 1, quantity: 1 })).toThrow(/weight unit/i);
		expect(() => calculateShippingTool('actual-weight', { weightUnit: 'kg', weight: -1, quantity: 1 })).toThrow(/non-negative/i);
		expect(() => calculateShippingTool('cbm', { dimensionUnit: 'cm', length: 0, width: 10, height: 10, packages: 1 })).toThrow(/greater than zero/i);
		expect(() => calculateShippingTool('product-pricing', { unitCost: 10, unitShipping: 0, otherUnitCost: 0, targetMargin: 100 })).toThrow(/less than 100/i);
		expect(() => calculateShippingTool('shipping-cost', { weightKg: 1, ratePerKg: 1, fixedFees: 0, handlingPercent: 101 })).toThrow(/between 0 and 100/i);
	});
});
