export interface ElectricityResult {
	dailyKwh: number;
	monthlyKwh: number;
	annualKwh: number;
	monthlyCost: number | null;
	annualCost: number | null;
}

export function calculateElectricity(wattage: number, hoursPerDay: number, daysPerMonth: number, tariff: number | null): ElectricityResult {
	if (![wattage, hoursPerDay, daysPerMonth].every(Number.isFinite)) {
		throw new Error('Enter valid wattage, hours and days.');
	}
	if (wattage < 0 || hoursPerDay < 0 || daysPerMonth < 0) {
		throw new Error('Wattage, hours and days must be non-negative.');
	}
	if (hoursPerDay > 24) throw new Error('Hours per day cannot exceed 24.');
	if (daysPerMonth > 31) throw new Error('Days per month cannot exceed 31.');
	if (tariff !== null && (!Number.isFinite(tariff) || tariff < 0)) {
		throw new Error('The tariff must be a valid non-negative value.');
	}

	const dailyKwh = (wattage * hoursPerDay) / 1000;
	const monthlyKwh = dailyKwh * daysPerMonth;
	const annualKwh = dailyKwh * 365;
	const monthlyCost = tariff === null ? null : monthlyKwh * tariff;
	const annualCost = tariff === null ? null : annualKwh * tariff;

	if (![dailyKwh, monthlyKwh, annualKwh].every(Number.isFinite) || (monthlyCost !== null && !Number.isFinite(monthlyCost)) || (annualCost !== null && !Number.isFinite(annualCost))) {
		throw new Error('These values are too large to calculate safely.');
	}

	return { dailyKwh, monthlyKwh, annualKwh, monthlyCost, annualCost };
}
