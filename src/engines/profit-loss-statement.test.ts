import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import {
	calculateProfitLossStatement,
	createProfitLossStatementPdf,
	formatProfitLossStatementAmount,
	type ProfitLossStatementInput,
} from './profit-loss-statement';

const statement: ProfitLossStatementInput = {
	businessName: 'Starmore Studio',
	periodStart: '2026-10-01',
	periodEnd: '2026-10-31',
	currency: 'NGN',
	incomeItems: [
		{ id: 'income-1', category: 'Services', description: 'Design work', amount: 125000.5 },
		{ id: 'income-2', category: 'Sales', description: 'Templates', amount: 25000 },
	],
	expenseItems: [
		{ id: 'expense-1', category: 'Software', description: 'Design software', amount: 15000.25 },
		{ id: 'expense-2', category: 'Travel', description: 'Client visit', amount: 5000 },
	],
	notes: 'Prepared for internal review.',
};

describe('profit and loss statement', () => {
	it('calculates totals in integer cents and reports net margin', () => {
		expect(calculateProfitLossStatement(statement)).toEqual({
			totalIncome: 150000.5,
			totalExpenses: 20000.25,
			netProfit: 130000.25,
			margin: (130000.25 / 150000.5) * 100,
		});
	});

	it('reports a loss and leaves margin unavailable when income is zero', () => {
		expect(calculateProfitLossStatement({
			...statement,
			incomeItems: [],
			expenseItems: [{ id: 'expense', category: 'Rent', description: 'Office rent', amount: 100 }],
		})).toMatchObject({ totalIncome: 0, totalExpenses: 100, netProfit: -100, margin: null });
	});

	it('validates the reporting period, line items, and required content', () => {
		expect(() => calculateProfitLossStatement({ ...statement, periodStart: '2026-02-30' })).toThrow('valid start and end dates');
		expect(() => calculateProfitLossStatement({ ...statement, periodStart: '2026-11-01' })).toThrow('on or after');
		expect(() => calculateProfitLossStatement({ ...statement, incomeItems: [], expenseItems: [] })).toThrow('at least one');
		expect(() => calculateProfitLossStatement({
			...statement,
			incomeItems: [{ id: 'income', category: 'Other income', description: 'Income', amount: Number.MAX_VALUE }],
		})).toThrow('invalid details or amount');
	});

	it('formats statement amounts with an explicit currency', () => {
		expect(formatProfitLossStatementAmount(1234.5, 'USD')).toBe('USD 1,234.50');
		expect(() => formatProfitLossStatementAmount(Number.NaN, 'USD')).toThrow('valid statement amount');
	});

	it('creates a readable-size PDF statement', async () => {
		const pdf = await PDFDocument.load(await createProfitLossStatementPdf(statement));
		expect(pdf.getPageCount()).toBe(1);
		expect(pdf.getPage(0).getHeight()).toBeGreaterThan(800);
	});

	it('supports longer statements by adding pages and rejects unsupported PDF text', async () => {
		const manyItems = Array.from({ length: 50 }, (_, index) => ({
			id: `line-${index}`,
			category: 'Services' as const,
			description: `Consulting project ${index + 1}`,
			amount: 100,
		}));
		const pdf = await PDFDocument.load(await createProfitLossStatementPdf({ ...statement, incomeItems: manyItems }));
		expect(pdf.getPageCount()).toBeGreaterThan(1);
		await expect(createProfitLossStatementPdf({ ...statement, businessName: 'Studio 東京' })).rejects.toThrow('supports basic Latin');
	});
});
