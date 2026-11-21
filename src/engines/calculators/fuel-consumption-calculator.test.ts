import { describe, expect, it } from 'vitest';
import { calculateFuelConsumption } from './fuel-consumption-calculator';

describe('calculateFuelConsumption', () => {
	it('calculates consumption metrics', () => {
		const result = calculateFuelConsumption(500, 40, null);
		expect(result.litresPer100Km).toBe(8);
		expect(result.kilometresPerLitre).toBe(12.5);
		expect(result.milesPerGallon).toBeCloseTo(29.4018, 3);
		expect(result.costPerDistance).toBeNull();
	});

	it('includes optional trip fuel cost', () => {
		expect(calculateFuelConsumption(500, 40, 1.5).costPerDistance).toBe(60);
	});

	it('rejects zero distance and negative fuel values', () => {
		expect(() => calculateFuelConsumption(0, 40, null)).toThrow('Distance must be greater than zero.');
		expect(() => calculateFuelConsumption(500, -1, null)).toThrow('Fuel used must be non-negative.');
		expect(() => calculateFuelConsumption(500, 40, -1)).toThrow('Fuel price must be non-negative.');
	});
});
