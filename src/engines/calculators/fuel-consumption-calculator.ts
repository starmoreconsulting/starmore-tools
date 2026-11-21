export interface FuelConsumptionResult {
	litresPer100Km: number;
	kilometresPerLitre: number;
	milesPerGallon: number;
	costPerDistance: number | null;
}

export function calculateFuelConsumption(distanceKm: number, fuelLitres: number, pricePerLitre: number | null): FuelConsumptionResult {
	if (![distanceKm, fuelLitres].every(Number.isFinite) || (pricePerLitre !== null && !Number.isFinite(pricePerLitre))) {
		throw new Error('Enter valid numbers for distance, fuel and optional price.');
	}
	if (distanceKm <= 0) throw new Error('Distance must be greater than zero.');
	if (fuelLitres < 0) throw new Error('Fuel used must be non-negative.');
	if (pricePerLitre !== null && pricePerLitre < 0) throw new Error('Fuel price must be non-negative.');

	const litresPer100Km = (fuelLitres / distanceKm) * 100;
	const kilometresPerLitre = litresPer100Km === 0 ? 0 : 100 / litresPer100Km;
	const milesPerGallon = kilometresPerLitre * 2.352145833;
	const costPerDistance = pricePerLitre === null ? null : fuelLitres * pricePerLitre;

	if (![litresPer100Km, kilometresPerLitre, milesPerGallon].every(Number.isFinite) || (costPerDistance !== null && !Number.isFinite(costPerDistance))) {
		throw new Error('These values are too large to calculate safely.');
	}

	return { litresPer100Km, kilometresPerLitre, milesPerGallon, costPerDistance };
}
