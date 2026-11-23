import { describe, expect, it } from 'vitest';
import { calculateDebtPayoffPlans, DEBT_PAYOFF_MAX_MONTHS, type DebtPayoffInput } from './debt-payoff-planner';

const debts: DebtPayoffInput = {
	extraMonthlyPayment: 50,
	debts: [
		{ id: 'card', name: 'Credit card', balance: 1000, apr: 12, minimumPayment: 100 },
		{ id: 'loan', name: 'Personal loan', balance: 500, apr: 0, minimumPayment: 50 },
	],
};

describe('debt payoff planner', () => {
	it('compares snowball and avalanche with monthly interest and payoff schedules', () => {
		const result = calculateDebtPayoffPlans(debts);
		expect(result.plans.snowball.status).toBe('paid-off');
		expect(result.plans.avalanche.status).toBe('paid-off');
		expect(result.plans.snowball.payoffSchedule[0]).toMatchObject({ id: 'loan', paidOffMonth: 5 });
		expect(result.plans.avalanche.payoffSchedule[0]?.id).toBe('card');
		expect(result.plans.avalanche.totalInterest).toBeLessThan(result.plans.snowball.totalInterest!);
		expect(result.plans.avalanche.months).toBeGreaterThan(0);
		expect(result.minimumPaymentWarnings).toEqual([]);
	});

	it('flags minimums that do not cover the initial monthly interest and only reports complete totals', () => {
		const result = calculateDebtPayoffPlans({
			extraMonthlyPayment: 0,
			debts: [{ id: 'growing', name: 'Growing balance', balance: 1000, apr: 12, minimumPayment: 10 }],
		});
		expect(result.minimumPaymentWarnings).toEqual([{
			id: 'growing',
			name: 'Growing balance',
			monthlyInterest: 10,
			minimumPayment: 10,
		}]);
		expect(result.plans.snowball.status).toBe('limit-reached');
		expect(result.plans.snowball.months).toBeNull();
		expect(result.plans.snowball.totalInterest).toBeNull();
		expect(result.plans.snowball.unresolvedDebts[0]?.balance).toBe(1000);
	});

	it('accounts for extra payments that can rescue a debt whose minimum alone is insufficient', () => {
		const result = calculateDebtPayoffPlans({
			extraMonthlyPayment: 20,
			debts: [{ id: 'rescue', name: 'Rescuable debt', balance: 1000, apr: 12, minimumPayment: 10 }],
		});
		expect(result.minimumPaymentWarnings).toHaveLength(1);
		expect(result.plans.snowball.status).toBe('paid-off');
		expect(result.plans.snowball.totalInterest).not.toBeNull();
	});

	it('rejects invalid or impossible payment inputs explicitly', () => {
		expect(() => calculateDebtPayoffPlans({ ...debts, debts: [] })).toThrow('at least one debt');
		expect(() => calculateDebtPayoffPlans({ ...debts, extraMonthlyPayment: -1 })).toThrow('non-negative');
		expect(() => calculateDebtPayoffPlans({
			...debts,
			debts: [{ ...debts.debts[0], minimumPayment: 0 }],
		})).toThrow('minimum monthly payment must be greater than zero');
		expect(() => calculateDebtPayoffPlans({
			...debts,
			debts: [{ ...debts.debts[0], balance: Number.NaN }],
		})).toThrow('balance must be greater than zero');
	});

	it('caps projection length and withholds a complete payoff claim when the horizon is reached', () => {
		const result = calculateDebtPayoffPlans({
			extraMonthlyPayment: 0,
			debts: [{ id: 'long', name: 'Long payoff', balance: 1_000_000_000, apr: 0, minimumPayment: 0.01 }],
		});
		expect(DEBT_PAYOFF_MAX_MONTHS).toBe(1200);
		expect(result.plans.avalanche.status).toBe('limit-reached');
		expect(result.plans.avalanche.months).toBeNull();
		expect(result.plans.avalanche.totalInterest).toBeNull();
		expect(result.plans.avalanche.unresolvedDebts[0]?.balance).toBeGreaterThan(0);
	});
});
