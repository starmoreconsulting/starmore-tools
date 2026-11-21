export type PercentageCalculation = 'percent-of' | 'what-percent' | 'change';

export function calculatePercentage(
	mode: PercentageCalculation,
	first: number,
	second: number,
): number {
	let result: number;
	if (mode === 'percent-of') {
		result = (first / 100) * second;
	} else if (mode === 'what-percent') {
		if (second === 0) throw new Error('This calculation needs a non-zero divisor.');
		result = (first / second) * 100;
	} else {
		if (first === 0) throw new Error('This calculation needs a non-zero divisor.');
		result = ((second - first) / Math.abs(first)) * 100;
	}

	if (!Number.isFinite(result)) {
		throw new Error('These values are too large to calculate safely.');
	}
	return result;
}
