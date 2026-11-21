export interface BreakEvenResult {
	units: number;
	revenue: number;
	contributionPerUnit: number;
}

export function calculateBreakEven(fixedCosts: number, sellingPrice: number, variableCost: number): BreakEvenResult {
	if (![fixedCosts, sellingPrice, variableCost].every(Number.isFinite)) {
		throw new Error('Enter valid numbers for fixed costs, selling price and variable cost.');
	}
	if (fixedCosts < 0 || sellingPrice < 0 || variableCost < 0) {
		throw new Error('Fixed costs, selling price and variable cost must be non-negative.');
	}

	const contributionPerUnit = sellingPrice - variableCost;
	if (contributionPerUnit <= 0) {
		throw new Error('Selling price must be greater than variable cost.');
	}

	const units = fixedCosts / contributionPerUnit;
	const revenue = units * sellingPrice;
	if (![units, revenue, contributionPerUnit].every(Number.isFinite)) {
		throw new Error('These values are too large to calculate safely.');
	}

	return { units, revenue, contributionPerUnit };
}
