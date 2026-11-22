import { describe, expect, it } from 'vitest';
import {
	addIncome,
	createIncomeCsv,
	decodeIncomeStorage,
	filterIncomeByMonth,
	removeIncome,
	summarizeIncome,
	validateIncomeDraft,
	type IncomeDraft,
	type IncomeEntry,
} from './income-tracker';

const draft: IncomeDraft = {
	date: '2026-11-22',
	description: 'Website project',
	category: 'Services',
	amount: 85000.75,
	currency: 'NGN',
	paymentMethod: 'Bank transfer',
	source: 'Example Client',
	reference: 'INV-2026-018',
};

const entries: IncomeEntry[] = [
	{ ...draft, id: 'one' },
	{ ...draft, id: 'two', date: '2026-10-12', amount: 25, currency: 'USD' },
	{ ...draft, id: 'three', amount: 100 },
];

describe('income tracker', () => {
	it('adds and removes income without mutating existing entries', () => {
		const next = addIncome(entries, draft, 'new');
		expect(next).toHaveLength(4);
		expect(next[0]).toMatchObject({ id: 'new', description: 'Website project', reference: 'INV-2026-018' });
		expect(entries).toHaveLength(3);
		expect(removeIncome(next, 'new')).toEqual(entries);
	});

	it('validates required fields, dates, and positive amounts', () => {
		expect(() => validateIncomeDraft({ ...draft, date: '2026-02-30' })).toThrow('valid income date');
		expect(() => validateIncomeDraft({ ...draft, description: ' ' })).toThrow('description');
		expect(() => validateIncomeDraft({ ...draft, amount: 0 })).toThrow('greater than zero');
		expect(() => validateIncomeDraft({ ...draft, amount: Number.MAX_VALUE })).toThrow('too large');
	});

	it('filters by month and totals separately by currency', () => {
		expect(filterIncomeByMonth(entries, '2026-11')).toHaveLength(2);
		expect(summarizeIncome(entries)).toEqual(new Map([['NGN', 85100.75], ['USD', 25]]));
		expect(() => filterIncomeByMonth(entries, '2026-13')).toThrow('valid month filter');
	});

	it('exports escaped CSV and guards spreadsheet formula cells', () => {
		const csv = createIncomeCsv([{ ...draft, id: 'csv', description: '=1+1', source: 'Client, "A"' }]);
		expect(csv).toContain('"\'=1+1"');
		expect(csv).toContain('"Client, ""A"""');
		expect(csv).toContain('"INV-2026-018"');
	});

	it('loads only valid persisted income records', () => {
		expect(decodeIncomeStorage(JSON.stringify(entries))).toEqual(entries);
		expect(decodeIncomeStorage(null)).toEqual([]);
		expect(() => decodeIncomeStorage('{invalid')).toThrow('Could not read saved income');
		expect(() => decodeIncomeStorage(JSON.stringify([{ ...draft, id: 'bad', category: 'Unknown' }]))).toThrow('Saved income entry 1 is invalid');
	});
});
