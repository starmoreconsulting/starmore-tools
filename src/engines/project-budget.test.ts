import { describe, expect, it } from 'vitest';
import {
	calculateProjectBudget,
	createProjectBudgetCsv,
	formatProjectBudgetAmount,
	type ProjectBudgetInput,
} from './project-budget';

const budget: ProjectBudgetInput = {
	currency: 'NGN',
	contingencyRate: 10,
	budgetLimit: 1000,
	items: [
		{ id: 'one', description: 'Design work', category: 'Professional services', quantity: 2, unitCost: 250.25 },
		{ id: 'two', description: 'Materials', category: 'Materials', quantity: 3, unitCost: 50 },
		{ id: 'three', description: 'More design', category: 'Professional services', quantity: 1, unitCost: 100 },
	],
};

describe('project budget calculator', () => {
	it('calculates quantity subtotals, contingency, category totals, and budget remainder', () => {
		expect(calculateProjectBudget(budget)).toEqual({
			subtotal: 750.5,
			contingency: 75.05,
			total: 825.55,
			budgetLimit: 1000,
			remaining: 174.45,
			overBudget: 0,
			categoryTotals: new Map([['Professional services', 600.5], ['Materials', 150]]),
		});
	});

	it('reports over-budget amount and supports no limit or contingency', () => {
		expect(calculateProjectBudget({ ...budget, budgetLimit: 700 }).overBudget).toBe(125.55);
		expect(calculateProjectBudget({ ...budget, budgetLimit: null, contingencyRate: 0 })).toMatchObject({
			subtotal: 750.5,
			contingency: 0,
			total: 750.5,
			remaining: null,
			overBudget: 0,
		});
	});

	it('rejects invalid quantities, costs, contingency, and currency', () => {
		expect(() => calculateProjectBudget({ ...budget, items: [{ ...budget.items[0], quantity: 0 }] })).toThrow('quantity must be greater than zero');
		expect(() => calculateProjectBudget({ ...budget, items: [{ ...budget.items[0], unitCost: -1 }] })).toThrow('unit cost must be zero or more');
		expect(() => calculateProjectBudget({ ...budget, contingencyRate: 101 })).toThrow('between 0 and 100%');
		expect(() => calculateProjectBudget({ ...budget, currency: 'XXX' as ProjectBudgetInput['currency'] })).toThrow('supported currency');
		expect(() => calculateProjectBudget({ ...budget, items: [{ ...budget.items[0], description: ' ' }] })).toThrow('description for budget item 1');
	});

	it('detects unsafe line totals and limits item count', () => {
		expect(() => calculateProjectBudget({ ...budget, items: [{ ...budget.items[0], quantity: Number.MAX_VALUE, unitCost: 10 }] })).toThrow('too large');
		const manyItems = Array.from({ length: 51 }, (_, index) => ({ ...budget.items[0], id: `item-${index}` }));
		expect(() => calculateProjectBudget({ ...budget, items: manyItems })).toThrow('up to 50 items');
	});

	it('exports a CSV summary and protects spreadsheet formula cells', () => {
		const csv = createProjectBudgetCsv({
			...budget,
			items: [{ id: 'formula', description: '=WEBSERVICE("example")', category: 'Other', quantity: 1, unitCost: 25 }],
		});
		expect(csv).toContain('"\'=WEBSERVICE(""example"")"');
		expect(csv).toContain('"Estimated total","27.50","NGN"');
		expect(csv).toContain('"Budget limit","1000.00","NGN"');
	});

	it('formats amounts with an explicit currency', () => {
		expect(formatProjectBudgetAmount(1234.5, 'USD')).toBe('USD 1,234.50');
		expect(() => formatProjectBudgetAmount(Number.NaN, 'USD')).toThrow('valid budget amount');
	});
});
