export const EXPENSE_TRACKER_STORAGE_KEY = 'starmore-expense-tracker-v1';
export const EXPENSE_TRACKER_CURRENCIES = ['NGN', 'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'GHS', 'KES', 'ZAR', 'INR'] as const;
export const EXPENSE_TRACKER_CATEGORIES = [
	'Office supplies',
	'Travel',
	'Utilities',
	'Rent',
	'Software',
	'Meals',
	'Equipment',
	'Shipping',
	'Marketing',
	'Other',
] as const;
export const EXPENSE_TRACKER_PAYMENT_METHODS = ['Cash', 'Bank transfer', 'Card', 'Mobile money', 'Cheque', 'Other'] as const;

export type ExpenseTrackerCurrency = (typeof EXPENSE_TRACKER_CURRENCIES)[number];
export type ExpenseTrackerCategory = (typeof EXPENSE_TRACKER_CATEGORIES)[number];
export type ExpenseTrackerPaymentMethod = (typeof EXPENSE_TRACKER_PAYMENT_METHODS)[number];

export interface ExpenseEntry {
	id: string;
	date: string;
	description: string;
	category: ExpenseTrackerCategory;
	amount: number;
	currency: ExpenseTrackerCurrency;
	paymentMethod: ExpenseTrackerPaymentMethod;
	vendor: string;
}

export interface ExpenseDraft extends Omit<ExpenseEntry, 'id'> {}

function isString(value: unknown): value is string {
	return typeof value === 'string';
}

export function isOneOf<T extends string>(value: unknown, values: readonly T[]): value is T {
	return typeof value === 'string' && values.some((candidate) => candidate === value);
}

function isValidDate(value: string): boolean {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
	if (!match) return false;
	const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
	return date.toISOString().slice(0, 10) === value;
}

export function validateExpenseDraft(draft: ExpenseDraft): void {
	if (!isValidDate(draft.date)) throw new Error('Enter a valid expense date.');
	if (!draft.description.trim()) throw new Error('Enter an expense description.');
	if (draft.description.length > 200) throw new Error('Description must be 200 characters or fewer.');
	if (!EXPENSE_TRACKER_CATEGORIES.includes(draft.category)) throw new Error('Choose a valid expense category.');
	if (!Number.isFinite(draft.amount) || draft.amount <= 0) throw new Error('Expense amount must be greater than zero.');
	if (!Number.isSafeInteger(Math.round(draft.amount * 100))) throw new Error('Expense amount is too large to record safely.');
	if (!EXPENSE_TRACKER_CURRENCIES.includes(draft.currency)) throw new Error('Choose a supported currency.');
	if (!EXPENSE_TRACKER_PAYMENT_METHODS.includes(draft.paymentMethod)) throw new Error('Choose a valid payment method.');
	if (draft.vendor.length > 120) throw new Error('Vendor must be 120 characters or fewer.');
}

export function validateExpenseEntries(value: unknown): ExpenseEntry[] {
	if (!Array.isArray(value)) throw new Error('Saved expenses are not a valid list.');
	return value.map((entry, index) => {
		if (!entry || typeof entry !== 'object') throw new Error(`Saved expense ${index + 1} is invalid.`);
		const candidate = entry as Record<string, unknown>;
		if (!isString(candidate.id) || !candidate.id || candidate.id.length > 120
			|| !isString(candidate.date)
			|| !isString(candidate.description)
			|| !isOneOf(candidate.category, EXPENSE_TRACKER_CATEGORIES)
			|| typeof candidate.amount !== 'number'
			|| !isOneOf(candidate.currency, EXPENSE_TRACKER_CURRENCIES)
			|| !isOneOf(candidate.paymentMethod, EXPENSE_TRACKER_PAYMENT_METHODS)
			|| !isString(candidate.vendor)) {
			throw new Error(`Saved expense ${index + 1} is invalid.`);
		}
		const expense: ExpenseEntry = {
			id: candidate.id,
			date: candidate.date,
			description: candidate.description,
			category: candidate.category,
			amount: candidate.amount,
			currency: candidate.currency,
			paymentMethod: candidate.paymentMethod,
			vendor: candidate.vendor,
		};
		validateExpenseDraft(expense);
		return expense;
	});
}

export function addExpense(entries: ExpenseEntry[], draft: ExpenseDraft, id = crypto.randomUUID()): ExpenseEntry[] {
	validateExpenseDraft(draft);
	if (!id.trim() || id.length > 120) throw new Error('Could not create an expense record.');
	if (entries.some((entry) => entry.id === id)) throw new Error('An expense with this identifier already exists.');
	return [{ ...draft, description: draft.description.trim(), vendor: draft.vendor.trim(), id }, ...entries];
}

export function removeExpense(entries: ExpenseEntry[], id: string): ExpenseEntry[] {
	return entries.filter((entry) => entry.id !== id);
}

export function filterExpensesByMonth(entries: ExpenseEntry[], month: string): ExpenseEntry[] {
	if (!month) return entries;
	if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error('Choose a valid month filter.');
	return entries.filter((entry) => entry.date.startsWith(`${month}-`));
}

export function summarizeExpenses(entries: ExpenseEntry[]): Map<ExpenseTrackerCurrency, number> {
	const totals = new Map<ExpenseTrackerCurrency, number>();
	for (const expense of entries) {
		const cents = Math.round(expense.amount * 100);
		const nextCents = Math.round((totals.get(expense.currency) ?? 0) * 100) + cents;
		if (!Number.isSafeInteger(nextCents)) throw new Error(`The ${expense.currency} expense total is too large.`);
		totals.set(expense.currency, nextCents / 100);
	}
	return totals;
}

function csvCell(value: string): string {
	const safeValue = /^[\s]*[=+\-@]/.test(value) ? `'${value}` : value;
	return `"${safeValue.replace(/"/g, '""')}"`;
}

export function createExpenseCsv(entries: ExpenseEntry[]): string {
	const header = ['Date', 'Description', 'Category', 'Amount', 'Currency', 'Payment method', 'Vendor'];
	const rows = entries.map((entry) => [
		entry.date,
		entry.description,
		entry.category,
		entry.amount.toFixed(2),
		entry.currency,
		entry.paymentMethod,
		entry.vendor,
	]);
	return [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
}

export function decodeExpenseStorage(value: string | null): ExpenseEntry[] {
	if (value === null) return [];
	try {
		return validateExpenseEntries(JSON.parse(value) as unknown);
	} catch (error) {
		throw new Error(error instanceof Error ? `Could not read saved expenses: ${error.message}` : 'Could not read saved expenses.');
	}
}

export function encodeExpenseStorage(entries: ExpenseEntry[]): string {
	return JSON.stringify(validateExpenseEntries(entries));
}
