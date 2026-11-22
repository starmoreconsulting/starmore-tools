import { EXPENSE_TRACKER_CURRENCIES, isOneOf, type ExpenseTrackerCurrency } from './expense-tracker';

export const COMMISSION_CALCULATOR_CURRENCIES = EXPENSE_TRACKER_CURRENCIES;

export interface CommissionCalculatorInput {
	salesAmount: number;
	commissionRate: number;
	basePay: number;
	currency: ExpenseTrackerCurrency;
}

export interface CommissionCalculatorResult {
	salesAmount: number;
	commissionRate: number;
	commission: number;
	basePay: number;
	totalEarnings: number;
}

export function calculateCommission(input: CommissionCalculatorInput): CommissionCalculatorResult {
	if (!Number.isFinite(input.salesAmount) || input.salesAmount < 0
		|| !Number.isSafeInteger(Math.round(input.salesAmount * 100))) {
		throw new Error('Enter a non-negative sales amount within the supported amount.');
	}
	if (!Number.isFinite(input.commissionRate) || input.commissionRate < 0 || input.commissionRate > 100) {
		throw new Error('Commission rate must be between 0 and 100%.');
	}
	if (!Number.isFinite(input.basePay) || input.basePay < 0
		|| !Number.isSafeInteger(Math.round(input.basePay * 100))) {
		throw new Error('Enter a non-negative base pay within the supported amount.');
	}
	if (!isOneOf(input.currency, COMMISSION_CALCULATOR_CURRENCIES)) throw new Error('Choose a supported currency.');

	const salesCents = Math.round(input.salesAmount * 100);
	const basePayCents = Math.round(input.basePay * 100);
	const commissionCents = Math.round(salesCents * input.commissionRate / 100);
	const totalEarningsCents = commissionCents + basePayCents;
	if (!Number.isSafeInteger(commissionCents) || !Number.isSafeInteger(totalEarningsCents)) {
		throw new Error('Commission total is too large to calculate safely.');
	}

	return {
		salesAmount: salesCents / 100,
		commissionRate: input.commissionRate,
		commission: commissionCents / 100,
		basePay: basePayCents / 100,
		totalEarnings: totalEarningsCents / 100,
	};
}

export function formatCommissionAmount(amount: number, currency: string): string {
	if (!Number.isFinite(amount)) throw new Error('Enter a valid commission amount.');
	return `${currency} ${new Intl.NumberFormat('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)}`;
}
