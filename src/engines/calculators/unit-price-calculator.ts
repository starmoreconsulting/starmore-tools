export interface UnitPriceComparison {
	firstUnitPrice: number;
	secondUnitPrice: number;
	betterValue: 'first' | 'second' | 'same';
	differencePerUnit: number;
	savingsPercent: number;
}

export function compareUnitPrices(
	firstPrice: number,
	firstQuantity: number,
	secondPrice: number,
	secondQuantity: number,
): UnitPriceComparison {
	if (!Number.isFinite(firstPrice) || firstPrice < 0 || !Number.isFinite(secondPrice) || secondPrice < 0) {
		throw new Error('Enter valid non-negative prices in the same currency.');
	}
	if (!Number.isFinite(firstQuantity) || firstQuantity <= 0 || !Number.isFinite(secondQuantity) || secondQuantity <= 0) {
		throw new Error('Enter quantities greater than zero in the same unit.');
	}

	const firstUnitPrice = firstPrice / firstQuantity;
	const secondUnitPrice = secondPrice / secondQuantity;
	if (!Number.isFinite(firstUnitPrice) || !Number.isFinite(secondUnitPrice)) {
		throw new Error('These values are too large to compare safely.');
	}

	const higherUnitPrice = Math.max(firstUnitPrice, secondUnitPrice);
	const lowerUnitPrice = Math.min(firstUnitPrice, secondUnitPrice);
	return {
		firstUnitPrice,
		secondUnitPrice,
		betterValue: firstUnitPrice === secondUnitPrice ? 'same' : firstUnitPrice < secondUnitPrice ? 'first' : 'second',
		differencePerUnit: higherUnitPrice - lowerUnitPrice,
		savingsPercent: higherUnitPrice === 0 ? 0 : (1 - lowerUnitPrice / higherUnitPrice) * 100,
	};
}
