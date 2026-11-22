import { describe, expect, it } from 'vitest';
import {
	addExpense,
	createExpenseCsv,
	decodeExpenseStorage,
	filterExpensesByMonth,
	removeExpense,
	summarizeExpenses,
	validateExpenseDraft,
	type ExpenseDraft,
	type ExpenseEntry,
} from './expense-tracker';

const draft: ExpenseDraft = {
	date: '2026-11-22',
	description: 'Printer paper',
	category: 'Office supplies',
	amount: 1250.5,
	currency: 'NGN',
	paymentMethod: 'Card',
	vendor: 'Paper House',
};

const entries: ExpenseEntry[] = [
	{ ...draft, id: 'one' },
	{ ...draft, id: 'two', date: '2026-10-12', amount: 25, currency: 'USD' },
	{ ...draft, id: 'three', amount: 100 },
];

describe('expense tracker', () => {
	it('adds and removes expenses without mutating existing entries', () => {
		const next = addExpense(entries, draft, 'new');
		expect(next).toHaveLength(4);
		expect(next[0]).toMatchObject({ id: 'new', description: 'Printer paper' });
		expect(entries).toHaveLength(3);
		expect(removeExpense(next, 'new')).toEqual(entries);
	});

	it('validates required fields, dates, and positive amounts', () => {
		expect(() => validateExpenseDraft({ ...draft, date: '2026-02-30' })).toThrow('valid expense date');
		expect(() => validateExpenseDraft({ ...draft, description: ' ' })).toThrow('description');
		expect(() => validateExpenseDraft({ ...draft, amount: 0 })).toThrow('greater than zero');
		expect(() => validateExpenseDraft({ ...draft, amount: Number.MAX_VALUE })).toThrow('too large');
	});

	it('filters entries by calendar month and separates currency totals', () => {
		expect(filterExpensesByMonth(entries, '2026-11')).toHaveLength(2);
		expect(summarizeExpenses(entries)).toEqual(new Map([['NGN', 1350.5], ['USD', 25]]));
		expect(() => filterExpensesByMonth(entries, '2026-13')).toThrow('valid month filter');
	});

	it('exports escaped CSV and guards spreadsheet formula cells', () => {
		const csv = createExpenseCsv([{ ...draft, id: 'csv', description: '=1+1', vendor: 'Paper, "House"' }]);
		expect(csv).toContain('"\'=1+1"');
		expect(csv).toContain('"Paper, ""House"""');
	});

	it('loads only valid persisted records', () => {
		expect(decodeExpenseStorage(JSON.stringify(entries))).toEqual(entries);
		expect(decodeExpenseStorage(null)).toEqual([]);
		expect(() => decodeExpenseStorage('{invalid')).toThrow('Could not read saved expenses');
		expect(() => decodeExpenseStorage(JSON.stringify([{ ...draft, id: 'bad', category: 'Unknown' }]))).toThrow('Saved expense 1 is invalid');
	});
});
