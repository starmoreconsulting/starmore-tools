export interface StatisticsSummary {
	count: number;
	mean: number;
	median: number;
	modes: number[] | null;
	range: number;
}

const MAX_VALUES = 10_000;

export function summarizeNumbers(source: string): StatisticsSummary {
	const tokens = source.trim().split(/[\s,]+/).filter(Boolean);
	if (tokens.length === 0) throw new Error('Enter at least one number.');
	if (tokens.length > MAX_VALUES) throw new Error(`Enter no more than ${MAX_VALUES.toLocaleString()} numbers.`);

	const values = tokens.map(Number);
	if (values.some((value) => !Number.isFinite(value))) {
		throw new Error('Use only finite numbers separated by commas or spaces.');
	}

	const sorted = [...values].sort((a, b) => a - b);
	const total = values.reduce((sum, value) => sum + value / values.length, 0);
	const middle = Math.floor(sorted.length / 2);
	const median = sorted.length % 2 === 1
		? sorted[middle]
		: sorted[middle - 1] / 2 + sorted[middle] / 2;
	const range = sorted[sorted.length - 1] - sorted[0];
	if (![total, median, range].every(Number.isFinite)) {
		throw new Error('These values are too large to summarize safely.');
	}

	const frequencies = new Map<number, number>();
	for (const value of values) frequencies.set(value, (frequencies.get(value) ?? 0) + 1);
	const highestFrequency = Math.max(...frequencies.values());
	const modes = highestFrequency < 2
		? null
		: [...frequencies].filter(([, frequency]) => frequency === highestFrequency).map(([value]) => value).sort((a, b) => a - b);

	return { count: values.length, mean: total, median, modes, range };
}
