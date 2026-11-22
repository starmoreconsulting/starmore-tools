import {
	EXPENSE_TRACKER_CURRENCIES,
	EXPENSE_TRACKER_PAYMENT_METHODS,
	isOneOf,
	type ExpenseTrackerCurrency,
	type ExpenseTrackerPaymentMethod,
} from './expense-tracker';

export const INCOME_TRACKER_STORAGE_KEY = 'starmore-income-tracker-v1';
export const INCOME_TRACKER_CATEGORIES = [
	'Sales',
	'Services',
	'Consulting',
	'Interest',
	'Rental income',
	'Commission',
	'Refund',
	'Other',
] as const;

export type IncomeTrackerCategory = (typeof INCOME_TRACKER_CATEGORIES)[number];
export type IncomeTrackerCurrency = ExpenseTrackerCurrency;
export type IncomeTrackerPaymentMethod = ExpenseTrackerPaymentMethod;

export interface IncomeEntry {
	id: string;
	date: string;
	description: string;
	category: IncomeTrackerCategory;
	amount: number;
	currency: IncomeTrackerCurrency;
	paymentMethod: IncomeTrackerPaymentMethod;
	source: string;
	reference: string;
}

export interface IncomeDraft extends Omit<IncomeEntry, 'id'> {}

function isString(value: unknown): value is string {
	return typeof value === 'string';
}

function isValidDate(value: string): boolean {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
	if (!match) return false;
	const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
	return date.toISOString().slice(0, 10) === value;
}

export function validateIncomeDraft(draft: IncomeDraft): void {
	if (!isValidDate(draft.date)) throw new Error('Enter a valid income date.');
	if (!draft.description.trim()) throw new Error('Enter an income description.');
	if (draft.description.length > 200) throw new Error('Description must be 200 characters or fewer.');
	if (!isOneOf(draft.category, INCOME_TRACKER_CATEGORIES)) throw new Error('Choose a valid income category.');
	if (!Number.isFinite(draft.amount) || draft.amount <= 0) throw new Error('Income amount must be greater than zero.');
	if (!Number.isSafeInteger(Math.round(draft.amount * 100))) throw new Error('Income amount is too large to record safely.');
	if (!isOneOf(draft.currency, EXPENSE_TRACKER_CURRENCIES)) throw new Error('Choose a supported currency.');
	if (!isOneOf(draft.paymentMethod, EXPENSE_TRACKER_PAYMENT_METHODS)) throw new Error('Choose a valid payment method.');
	if (draft.source.length > 120) throw new Error('Income source must be 120 characters or fewer.');
	if (draft.reference.length > 120) throw new Error('Income reference must be 120 characters or fewer.');
}

export function validateIncomeEntries(value: unknown): IncomeEntry[] {
	if (!Array.isArray(value)) throw new Error('Saved income is not a valid list.');
	return value.map((entry, index) => {
		if (!entry || typeof entry !== 'object') throw new Error(`Saved income entry ${index + 1} is invalid.`);
		const candidate = entry as Record<string, unknown>;
		if (!isString(candidate.id) || !candidate.id || candidate.id.length > 120
			|| !isString(candidate.date)
			|| !isString(candidate.description)
			|| !isOneOf(candidate.category, INCOME_TRACKER_CATEGORIES)
			|| typeof candidate.amount !== 'number'
			|| !isOneOf(candidate.currency, EXPENSE_TRACKER_CURRENCIES)
			|| !isOneOf(candidate.paymentMethod, EXPENSE_TRACKER_PAYMENT_METHODS)
			|| !isString(candidate.source)
			|| !isString(candidate.reference)) {
			throw new Error(`Saved income entry ${index + 1} is invalid.`);
		}
		const income: IncomeEntry = {
			id: candidate.id,
			date: candidate.date,
			description: candidate.description,
			category: candidate.category,
			amount: candidate.amount,
			currency: candidate.currency,
			paymentMethod: candidate.paymentMethod,
			source: candidate.source,
			reference: candidate.reference,
		};
		validateIncomeDraft(income);
		return income;
	});
}

export function addIncome(entries: IncomeEntry[], draft: IncomeDraft, id = crypto.randomUUID()): IncomeEntry[] {
	validateIncomeDraft(draft);
	if (!id.trim() || id.length > 120) throw new Error('Could not create an income record.');
	if (entries.some((entry) => entry.id === id)) throw new Error('An income entry with this identifier already exists.');
	return [{ ...draft, description: draft.description.trim(), source: draft.source.trim(), reference: draft.reference.trim(), id }, ...entries];
}

export function removeIncome(entries: IncomeEntry[], id: string): IncomeEntry[] {
	return entries.filter((entry) => entry.id !== id);
}

export function filterIncomeByMonth(entries: IncomeEntry[], month: string): IncomeEntry[] {
	if (!month) return entries;
	if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error('Choose a valid month filter.');
	return entries.filter((entry) => entry.date.startsWith(`${month}-`));
}

export function summarizeIncome(entries: IncomeEntry[]): Map<IncomeTrackerCurrency, number> {
	const totals = new Map<IncomeTrackerCurrency, number>();
	for (const income of entries) {
		const cents = Math.round(income.amount * 100);
		const nextCents = Math.round((totals.get(income.currency) ?? 0) * 100) + cents;
		if (!Number.isSafeInteger(nextCents)) throw new Error(`The ${income.currency} income total is too large.`);
		totals.set(income.currency, nextCents / 100);
	}
	return totals;
}

function csvCell(value: string): string {
	const safeValue = /^[\s]*[=+\-@]/.test(value) ? `'${value}` : value;
	return `"${safeValue.replace(/"/g, '""')}"`;
}

export function createIncomeCsv(entries: IncomeEntry[]): string {
	const header = ['Date', 'Description', 'Category', 'Amount', 'Currency', 'Payment method', 'Source', 'Reference'];
	const rows = entries.map((entry) => [
		entry.date,
		entry.description,
		entry.category,
		entry.amount.toFixed(2),
		entry.currency,
		entry.paymentMethod,
		entry.source,
		entry.reference,
	]);
	return [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
}

export function decodeIncomeStorage(value: string | null): IncomeEntry[] {
	if (value === null) return [];
	try {
		return validateIncomeEntries(JSON.parse(value) as unknown);
	} catch (error) {
		throw new Error(error instanceof Error ? `Could not read saved income: ${error.message}` : 'Could not read saved income.');
	}
}

export function encodeIncomeStorage(entries: IncomeEntry[]): string {
	return JSON.stringify(validateIncomeEntries(entries));
}
