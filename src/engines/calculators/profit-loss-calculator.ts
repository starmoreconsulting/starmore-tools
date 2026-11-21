export interface ProfitLossResult {
	profit: number;
	margin: number | null;
	expenseRatio: number | null;
}

export function calculateProfitLoss(revenue: number, expenses: number): ProfitLossResult {
	if (!Number.isFinite(revenue) || !Number.isFinite(expenses)) {
		throw new Error('Enter valid numbers for revenue and expenses.');
	}
	if (revenue < 0 || expenses < 0) {
		throw new Error('Revenue and expenses must be non-negative.');
	}

	const profit = revenue - expenses;
	const margin = revenue === 0 ? null : (profit / revenue) * 100;
	const expenseRatio = revenue === 0 ? null : (expenses / revenue) * 100;

	if (!Number.isFinite(profit) || (margin !== null && !Number.isFinite(margin)) || (expenseRatio !== null && !Number.isFinite(expenseRatio))) {
		throw new Error('These values are too large to calculate safely.');
	}

	return { profit, margin, expenseRatio };
}
