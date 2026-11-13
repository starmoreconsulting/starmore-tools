export function readFiniteNumber(value: string): number | null {
	if (value.trim() === '') return null;
	const number = Number(value);
	return Number.isFinite(number) ? number : null;
}

export function formatAmount(value: number): string {
	return new Intl.NumberFormat(undefined, {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(value);
}

export function formatValue(value: number): string {
	return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value);
}
