import { describe, expect, it } from 'vitest';
import { calculateElectricity } from './electricity-consumption-calculator';

describe('calculateElectricity', () => {
	it('calculates daily, monthly and annual consumption', () => {
		expect(calculateElectricity(100, 5, 30, null)).toEqual({ dailyKwh: 0.5, monthlyKwh: 15, annualKwh: 182.5, monthlyCost: null, annualCost: null });
	});

	it('calculates costs when a tariff is supplied', () => {
		const result = calculateElectricity(1000, 4, 30, 0.25);
		expect(result.dailyKwh).toBe(4);
		expect(result.monthlyKwh).toBe(120);
		expect(result.monthlyCost).toBe(30);
		expect(result.annualCost).toBe(365);
	});

	it('rejects invalid ranges', () => {
		expect(() => calculateElectricity(100, 25, 30, null)).toThrow('Hours per day cannot exceed 24.');
		expect(() => calculateElectricity(100, 5, 32, null)).toThrow('Days per month cannot exceed 31.');
		expect(() => calculateElectricity(-100, 5, 30, null)).toThrow('Wattage, hours and days must be non-negative.');
	});

	it('rejects an invalid tariff', () => {
		expect(() => calculateElectricity(100, 5, 30, -1)).toThrow('The tariff must be a valid non-negative value.');
	});
});
