export const DEBT_PAYOFF_MAX_DEBTS = 50;
export const DEBT_PAYOFF_MAX_MONTHS = 1200;

const MAX_AMOUNT = 1_000_000_000_000;
const MAX_BALANCE_DURING_SIMULATION = 1_000_000_000_000_000;
const BALANCE_EPSILON = 1e-8;

export interface DebtPayoffDebt {
	id: string;
	name: string;
	balance: number;
	apr: number;
	minimumPayment: number;
}

export interface DebtPayoffInput {
	debts: DebtPayoffDebt[];
	extraMonthlyPayment: number;
}

export type DebtPayoffStrategy = 'snowball' | 'avalanche';
export type DebtPayoffStatus = 'paid-off' | 'limit-reached' | 'unstable';

export interface DebtPayoffScheduleEntry {
	id: string;
	name: string;
	paidOffMonth: number;
}

export interface DebtPayoffMinimumWarning {
	id: string;
	name: string;
	monthlyInterest: number;
	minimumPayment: number;
}

export interface DebtPayoffUnresolvedDebt {
	id: string;
	name: string;
	balance: number;
}

export interface DebtPayoffPlan {
	strategy: DebtPayoffStrategy;
	status: DebtPayoffStatus;
	months: number | null;
	totalInterest: number | null;
	payoffSchedule: DebtPayoffScheduleEntry[];
	unresolvedDebts: DebtPayoffUnresolvedDebt[];
}

export interface DebtPayoffResults {
	minimumPaymentWarnings: DebtPayoffMinimumWarning[];
	plans: Record<DebtPayoffStrategy, DebtPayoffPlan>;
}

function validateInput(input: DebtPayoffInput): void {
	if (!Array.isArray(input.debts) || input.debts.length === 0) {
		throw new Error('Add at least one debt to compare payoff strategies.');
	}
	if (input.debts.length > DEBT_PAYOFF_MAX_DEBTS) {
		throw new Error(`Add no more than ${DEBT_PAYOFF_MAX_DEBTS} debts.`);
	}
	if (!Number.isFinite(input.extraMonthlyPayment) || input.extraMonthlyPayment < 0 || input.extraMonthlyPayment > MAX_AMOUNT) {
		throw new Error('Extra monthly payment must be a non-negative amount within the supported limit.');
	}

	const ids = new Set<string>();
	for (const [index, debt] of input.debts.entries()) {
		const label = `Debt ${index + 1}`;
		if (!debt.id.trim() || ids.has(debt.id)) throw new Error(`${label} must have a unique identifier.`);
		ids.add(debt.id);
		if (!debt.name.trim() || debt.name.length > 100) throw new Error(`Enter a name of 1 to 100 characters for ${label.toLowerCase()}.`);
		if (!Number.isFinite(debt.balance) || debt.balance <= 0 || debt.balance > MAX_AMOUNT) {
			throw new Error(`${debt.name} balance must be greater than zero and no more than ${MAX_AMOUNT.toLocaleString('en')}.`);
		}
		if (!Number.isFinite(debt.apr) || debt.apr < 0 || debt.apr > 100_000) {
			throw new Error(`${debt.name} APR must be between 0 and 100,000%.`);
		}
		if (!Number.isFinite(debt.minimumPayment) || debt.minimumPayment <= 0 || debt.minimumPayment > MAX_AMOUNT) {
			throw new Error(`${debt.name} minimum monthly payment must be greater than zero and within the supported limit.`);
		}
	}
}

function simulate(input: DebtPayoffInput, strategy: DebtPayoffStrategy): DebtPayoffPlan {
	const balances = input.debts.map((debt) => debt.balance);
	const paidOffMonth = new Map<string, number>();
	const payoffOrder = strategy === 'snowball'
		? [...input.debts.keys()].sort((a, b) => input.debts[a].balance - input.debts[b].balance
			|| input.debts[b].apr - input.debts[a].apr || a - b)
		: [...input.debts.keys()].sort((a, b) => input.debts[b].apr - input.debts[a].apr
			|| input.debts[a].balance - input.debts[b].balance || a - b);
	const monthlyBudget = input.debts.reduce((total, debt) => total + debt.minimumPayment, input.extraMonthlyPayment);
	let totalInterest = 0;
	let status: DebtPayoffStatus = 'limit-reached';
	let months = 0;

	for (let month = 1; month <= DEBT_PAYOFF_MAX_MONTHS; month += 1) {
		const interest = balances.map((balance, index) => balance > BALANCE_EPSILON
			? balance * input.debts[index].apr / 1200
			: 0);
		if (interest.some((amount) => !Number.isFinite(amount))) {
			status = 'unstable';
			break;
		}
		totalInterest += interest.reduce((sum, amount) => sum + amount, 0);
		if (!Number.isFinite(totalInterest)) {
			status = 'unstable';
			break;
		}
		for (let index = 0; index < balances.length; index += 1) {
			if (balances[index] > BALANCE_EPSILON) balances[index] += interest[index];
		}

		let remainingBudget = monthlyBudget;
		for (let index = 0; index < balances.length; index += 1) {
			if (balances[index] <= BALANCE_EPSILON) continue;
			const payment = Math.min(input.debts[index].minimumPayment, balances[index], remainingBudget);
			balances[index] -= payment;
			remainingBudget -= payment;
		}
		for (const index of payoffOrder) {
			if (remainingBudget <= BALANCE_EPSILON) break;
			if (balances[index] <= BALANCE_EPSILON) continue;
			const payment = Math.min(balances[index], remainingBudget);
			balances[index] -= payment;
			remainingBudget -= payment;
		}

		for (let index = 0; index < balances.length; index += 1) {
			if (balances[index] <= BALANCE_EPSILON && !paidOffMonth.has(input.debts[index].id)) {
				balances[index] = 0;
				paidOffMonth.set(input.debts[index].id, month);
			}
			if (!Number.isFinite(balances[index]) || balances[index] > MAX_BALANCE_DURING_SIMULATION) {
				status = 'unstable';
				months = month;
				break;
			}
		}
		if (status === 'unstable') break;
		months = month;
		if (balances.every((balance) => balance <= BALANCE_EPSILON)) {
			status = 'paid-off';
			break;
		}
	}

	const payoffSchedule = input.debts
		.filter((debt) => paidOffMonth.has(debt.id))
		.map((debt) => ({ id: debt.id, name: debt.name, paidOffMonth: paidOffMonth.get(debt.id)! }))
		.sort((a, b) => a.paidOffMonth - b.paidOffMonth || a.name.localeCompare(b.name));
	const unresolvedDebts = input.debts
		.map((debt, index) => ({ id: debt.id, name: debt.name, balance: balances[index] }))
		.filter((debt) => debt.balance > BALANCE_EPSILON);

	return {
		strategy,
		status,
		months: status === 'paid-off' ? months : null,
		totalInterest: status === 'paid-off' ? totalInterest : null,
		payoffSchedule,
		unresolvedDebts,
	};
}

export function calculateDebtPayoffPlans(input: DebtPayoffInput): DebtPayoffResults {
	validateInput(input);
	const minimumPaymentWarnings = input.debts.flatMap((debt) => {
		const monthlyInterest = debt.balance * debt.apr / 1200;
		return debt.minimumPayment <= monthlyInterest
			? [{ id: debt.id, name: debt.name, monthlyInterest, minimumPayment: debt.minimumPayment }]
			: [];
	});

	return {
		minimumPaymentWarnings,
		plans: {
			snowball: simulate(input, 'snowball'),
			avalanche: simulate(input, 'avalanche'),
		},
	};
}
