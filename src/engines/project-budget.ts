import { EXPENSE_TRACKER_CURRENCIES, isOneOf, type ExpenseTrackerCurrency } from './expense-tracker';

export const PROJECT_BUDGET_MAX_ITEMS = 50;
export const PROJECT_BUDGET_MAX_DESCRIPTION_LENGTH = 160;
export const PROJECT_BUDGET_CURRENCIES = EXPENSE_TRACKER_CURRENCIES;
export const PROJECT_BUDGET_CATEGORIES = [
	'Personnel',
	'Materials',
	'Equipment',
	'Travel',
	'Software',
	'Marketing',
	'Facilities',
	'Professional services',
	'Other',
] as const;

export type ProjectBudgetCategory = (typeof PROJECT_BUDGET_CATEGORIES)[number];

export interface ProjectBudgetItem {
	id: string;
	description: string;
	category: ProjectBudgetCategory;
	quantity: number;
	unitCost: number;
}

export interface ProjectBudgetInput {
	items: ProjectBudgetItem[];
	currency: ExpenseTrackerCurrency;
	contingencyRate: number;
	budgetLimit: number | null;
}

export interface ProjectBudgetTotals {
	subtotal: number;
	contingency: number;
	total: number;
	budgetLimit: number | null;
	remaining: number | null;
	overBudget: number;
	categoryTotals: Map<ProjectBudgetCategory, number>;
}

function lineCents(item: ProjectBudgetItem, index: number): number {
	if (!item.id.trim() || item.id.length > 120) throw new Error(`Budget item ${index + 1} has an invalid identifier.`);
	if (!item.description.trim()) throw new Error(`Enter a description for budget item ${index + 1}.`);
	if (item.description.length > PROJECT_BUDGET_MAX_DESCRIPTION_LENGTH) {
		throw new Error(`Budget item ${index + 1} description must be ${PROJECT_BUDGET_MAX_DESCRIPTION_LENGTH} characters or fewer.`);
	}
	if (!isOneOf(item.category, PROJECT_BUDGET_CATEGORIES)) throw new Error(`Choose a valid category for budget item ${index + 1}.`);
	if (!Number.isFinite(item.quantity) || item.quantity <= 0) throw new Error(`Budget item ${index + 1} quantity must be greater than zero.`);
	if (!Number.isFinite(item.unitCost) || item.unitCost < 0) throw new Error(`Budget item ${index + 1} unit cost must be zero or more.`);
	const cents = Math.round(item.quantity * item.unitCost * 100);
	if (!Number.isSafeInteger(cents) || cents < 0) throw new Error(`Budget item ${index + 1} amount is too large to calculate safely.`);
	return cents;
}

export function calculateProjectBudget(input: ProjectBudgetInput): ProjectBudgetTotals {
	if (!Array.isArray(input.items) || input.items.length > PROJECT_BUDGET_MAX_ITEMS) {
		throw new Error(`A project budget can include up to ${PROJECT_BUDGET_MAX_ITEMS} items.`);
	}
	if (!isOneOf(input.currency, PROJECT_BUDGET_CURRENCIES)) throw new Error('Choose a supported currency.');
	if (!Number.isFinite(input.contingencyRate) || input.contingencyRate < 0 || input.contingencyRate > 100) {
		throw new Error('Contingency must be between 0 and 100%.');
	}
	if (input.budgetLimit !== null
		&& (!Number.isFinite(input.budgetLimit) || input.budgetLimit < 0
			|| !Number.isSafeInteger(Math.round(input.budgetLimit * 100)))) {
		throw new Error('Enter a non-negative budget limit within the supported amount.');
	}

	const categoryCents = new Map<ProjectBudgetCategory, number>();
	let subtotalCents = 0;
	for (const [index, item] of input.items.entries()) {
		const cents = lineCents(item, index);
		subtotalCents += cents;
		if (!Number.isSafeInteger(subtotalCents)) throw new Error('Project budget total is too large to calculate safely.');
		const categoryTotal = (categoryCents.get(item.category) ?? 0) + cents;
		if (!Number.isSafeInteger(categoryTotal)) throw new Error(`The ${item.category} category total is too large.`);
		categoryCents.set(item.category, categoryTotal);
	}
	const contingencyCents = Math.round(subtotalCents * input.contingencyRate / 100);
	const totalCents = subtotalCents + contingencyCents;
	if (!Number.isSafeInteger(contingencyCents) || !Number.isSafeInteger(totalCents)) {
		throw new Error('Project budget total is too large to calculate safely.');
	}
	const limitCents = input.budgetLimit === null ? null : Math.round(input.budgetLimit * 100);
	const differenceCents = limitCents === null ? null : limitCents - totalCents;

	return {
		subtotal: subtotalCents / 100,
		contingency: contingencyCents / 100,
		total: totalCents / 100,
		budgetLimit: input.budgetLimit,
		remaining: differenceCents === null ? null : Math.max(differenceCents, 0) / 100,
		overBudget: differenceCents === null ? 0 : Math.max(-differenceCents, 0) / 100,
		categoryTotals: new Map([...categoryCents].map(([category, cents]) => [category, cents / 100])),
	};
}

export function formatProjectBudgetAmount(amount: number, currency: string): string {
	if (!Number.isFinite(amount)) throw new Error('Enter a valid budget amount.');
	return `${currency} ${new Intl.NumberFormat('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)}`;
}

function csvCell(value: string): string {
	const safeValue = /^[\s]*[=+\-@]/.test(value) ? `'${value}` : value;
	return `"${safeValue.replace(/"/g, '""')}"`;
}

export function createProjectBudgetCsv(input: ProjectBudgetInput): string {
	const totals = calculateProjectBudget(input);
	const rows: string[][] = [
		['Description', 'Category', 'Quantity', 'Unit cost', 'Line total', 'Currency'],
		...input.items.map((item) => [
			item.description.trim(),
			item.category,
			String(item.quantity),
			item.unitCost.toFixed(2),
			((Math.round(item.quantity * item.unitCost * 100)) / 100).toFixed(2),
			input.currency,
		]),
		[],
		['Subtotal', totals.subtotal.toFixed(2), input.currency],
		['Contingency rate', `${input.contingencyRate}%`],
		['Contingency', totals.contingency.toFixed(2), input.currency],
		['Estimated total', totals.total.toFixed(2), input.currency],
	];
	if (input.budgetLimit !== null) {
		rows.push(['Budget limit', input.budgetLimit.toFixed(2), input.currency]);
		rows.push([totals.overBudget ? 'Over budget' : 'Remaining budget', (totals.overBudget || (totals.remaining ?? 0)).toFixed(2), input.currency]);
	}
	return rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
}
