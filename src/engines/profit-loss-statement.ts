import { PDFDocument, StandardFonts, rgb, type PDFFont } from 'pdf-lib';
import { EXPENSE_TRACKER_CURRENCIES, isOneOf, type ExpenseTrackerCurrency } from './expense-tracker';

export const PROFIT_LOSS_STATEMENT_MAX_ITEMS = 50;
export const PROFIT_LOSS_STATEMENT_MAX_TEXT_LENGTH = 500;
export const PROFIT_LOSS_STATEMENT_CURRENCIES = EXPENSE_TRACKER_CURRENCIES;

export const PROFIT_LOSS_INCOME_CATEGORIES = [
	'Sales',
	'Services',
	'Interest income',
	'Rental income',
	'Commission income',
	'Other income',
] as const;

export const PROFIT_LOSS_EXPENSE_CATEGORIES = [
	'Cost of goods sold',
	'Payroll',
	'Rent',
	'Utilities',
	'Marketing',
	'Travel',
	'Software',
	'Supplies',
	'Other expenses',
] as const;

export type ProfitLossIncomeCategory = (typeof PROFIT_LOSS_INCOME_CATEGORIES)[number];
export type ProfitLossExpenseCategory = (typeof PROFIT_LOSS_EXPENSE_CATEGORIES)[number];

export interface ProfitLossStatementItem<Category extends string = string> {
	id: string;
	category: Category;
	description: string;
	amount: number;
}

export interface ProfitLossStatementInput {
	businessName: string;
	periodStart: string;
	periodEnd: string;
	currency: ExpenseTrackerCurrency;
	incomeItems: ProfitLossStatementItem<ProfitLossIncomeCategory>[];
	expenseItems: ProfitLossStatementItem<ProfitLossExpenseCategory>[];
	notes: string;
}

export interface ProfitLossStatementTotals {
	totalIncome: number;
	totalExpenses: number;
	netProfit: number;
	margin: number | null;
}

function isValidDate(value: string): boolean {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
	if (!match) return false;
	const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
	return date.toISOString().slice(0, 10) === value;
}

function validateItems<Category extends string>(
	items: ProfitLossStatementItem<Category>[],
	categories: readonly Category[],
	label: string,
): void {
	if (!Array.isArray(items) || items.length > PROFIT_LOSS_STATEMENT_MAX_ITEMS) {
		throw new Error(`A statement can include up to ${PROFIT_LOSS_STATEMENT_MAX_ITEMS} ${label.toLowerCase()} items.`);
	}
	const ids = new Set<string>();
	for (const [index, item] of items.entries()) {
		if (!item || typeof item !== 'object'
			|| typeof item.id !== 'string' || !item.id.trim() || item.id.length > 120
			|| !isOneOf(item.category, categories)
			|| typeof item.description !== 'string' || !item.description.trim()
			|| item.description.length > 200
			|| typeof item.amount !== 'number' || !Number.isFinite(item.amount) || item.amount <= 0
			|| !Number.isSafeInteger(Math.round(item.amount * 100))) {
			throw new Error(`${label} item ${index + 1} has invalid details or amount.`);
		}
		if (ids.has(item.id)) throw new Error(`${label} items must have unique identifiers.`);
		ids.add(item.id);
	}
}

export function validateProfitLossStatement(input: ProfitLossStatementInput): void {
	if (!input.businessName.trim()) throw new Error('Enter a business or organization name.');
	if (input.businessName.length > 120) throw new Error('Business name must be 120 characters or fewer.');
	if (!isValidDate(input.periodStart) || !isValidDate(input.periodEnd)) throw new Error('Enter valid start and end dates.');
	if (input.periodStart > input.periodEnd) throw new Error('The period end date must be on or after the start date.');
	if (!isOneOf(input.currency, PROFIT_LOSS_STATEMENT_CURRENCIES)) throw new Error('Choose a supported currency.');
	if (typeof input.notes !== 'string' || input.notes.length > PROFIT_LOSS_STATEMENT_MAX_TEXT_LENGTH) {
		throw new Error(`Notes must be ${PROFIT_LOSS_STATEMENT_MAX_TEXT_LENGTH} characters or fewer.`);
	}
	validateItems(input.incomeItems, PROFIT_LOSS_INCOME_CATEGORIES, 'Income');
	validateItems(input.expenseItems, PROFIT_LOSS_EXPENSE_CATEGORIES, 'Expense');
	if (input.incomeItems.length + input.expenseItems.length === 0) throw new Error('Add at least one income or expense item.');
}

function sumCents(items: ProfitLossStatementItem[]): number {
	let cents = 0;
	for (const item of items) {
		cents += Math.round(item.amount * 100);
		if (!Number.isSafeInteger(cents)) throw new Error('The statement total is too large to calculate safely.');
	}
	return cents;
}

export function calculateProfitLossStatement(input: ProfitLossStatementInput): ProfitLossStatementTotals {
	validateProfitLossStatement(input);
	const incomeCents = sumCents(input.incomeItems);
	const expenseCents = sumCents(input.expenseItems);
	const netCents = incomeCents - expenseCents;
	if (!Number.isSafeInteger(netCents)) throw new Error('The net profit or loss is too large to calculate safely.');
	return {
		totalIncome: incomeCents / 100,
		totalExpenses: expenseCents / 100,
		netProfit: netCents / 100,
		margin: incomeCents === 0 ? null : (netCents / incomeCents) * 100,
	};
}

export function formatProfitLossStatementAmount(amount: number, currency: string): string {
	if (!Number.isFinite(amount)) throw new Error('Enter a valid statement amount.');
	return `${currency} ${new Intl.NumberFormat('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)}`;
}

function pdfText(value: string): string {
	const text = value
		.replace(/\r\n?/g, '\n')
		.replace(/\t/g, ' ')
		.replace(/[\u2018\u2019]/g, "'")
		.replace(/[\u201c\u201d]/g, '"')
		.replace(/[\u2013\u2014]/g, '-')
		.replace(/\u2026/g, '...')
		.replace(/\u00a0/g, ' ');
	if (/[^\x20-\x7e\u00a0-\u00ff\n]/.test(text)) {
		throw new Error('PDF export supports basic Latin and Western European characters. Replace unsupported characters and try again.');
	}
	return text;
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
	const lines: string[] = [];
	for (const paragraph of pdfText(text).split('\n')) {
		let line = '';
		for (const word of paragraph.split(/\s+/).filter(Boolean)) {
			let remaining = word;
			while (remaining) {
				if (font.widthOfTextAtSize(line ? `${line} ${remaining}` : remaining, size) <= maxWidth) {
					line = line ? `${line} ${remaining}` : remaining;
					remaining = '';
				} else if (line) {
					lines.push(line);
					line = '';
				} else {
					let length = 1;
					while (length < remaining.length && font.widthOfTextAtSize(remaining.slice(0, length + 1), size) <= maxWidth) length += 1;
					lines.push(remaining.slice(0, length));
					remaining = remaining.slice(length);
				}
			}
		}
		lines.push(line);
	}
	return lines.length ? lines : [''];
}

function formatPeriodDate(value: string): string {
	return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`));
}

export async function createProfitLossStatementPdf(input: ProfitLossStatementInput): Promise<Uint8Array> {
	validateProfitLossStatement(input);
	const totals = calculateProfitLossStatement(input);
	const document = await PDFDocument.create();
	const regular = await document.embedFont(StandardFonts.Helvetica);
	const bold = await document.embedFont(StandardFonts.HelveticaBold);
	const pageSize: [number, number] = [595.28, 841.89];
	const margin = 44;
	const contentWidth = pageSize[0] - margin * 2;
	const accent = rgb(0.12, 0.38, 0.29);
	const dark = rgb(0.12, 0.18, 0.15);
	const muted = rgb(0.39, 0.43, 0.4);
	const lineColor = rgb(0.84, 0.87, 0.83);
	let page = document.addPage(pageSize);
	let y = pageSize[1] - margin;
	const bottom = margin + 34;

	const startPage = () => {
		page = document.addPage(pageSize);
		y = pageSize[1] - margin;
	};
	const ensureSpace = (height: number) => {
		if (y - height < bottom) startPage();
	};
	const drawSectionHeading = (title: string) => {
		ensureSpace(30);
		page.drawText(title.toUpperCase(), { x: margin, y, size: 10, font: bold, color: accent });
		y -= 17;
		page.drawLine({ start: { x: margin, y }, end: { x: pageSize[0] - margin, y }, thickness: 0.7, color: lineColor });
		y -= 14;
	};
	const drawLine = (label: string, amount: number, emphasize = false) => {
		const lines = wrapText(label, regular, 9, contentWidth - 120);
		const rowHeight = Math.max(16, lines.length * 12);
		ensureSpace(rowHeight + 2);
		for (const [index, line] of lines.entries()) {
			page.drawText(line, { x: margin, y: y - index * 12, size: 9, font: regular, color: dark });
		}
		const amountText = formatProfitLossStatementAmount(amount, input.currency);
		const amountWidth = (emphasize ? bold : regular).widthOfTextAtSize(amountText, 9);
		page.drawText(amountText, { x: pageSize[0] - margin - amountWidth, y, size: 9, font: emphasize ? bold : regular, color: dark });
		y -= rowHeight + 2;
	};
	const drawSubtotal = (label: string, amount: number) => {
		ensureSpace(27);
		y -= 3;
		page.drawLine({ start: { x: margin, y }, end: { x: pageSize[0] - margin, y }, thickness: 0.6, color: lineColor });
		y -= 15;
		const amountText = formatProfitLossStatementAmount(amount, input.currency);
		const amountWidth = bold.widthOfTextAtSize(amountText, 10);
		page.drawText(label, { x: margin, y, size: 10, font: bold, color: dark });
		page.drawText(amountText, { x: pageSize[0] - margin - amountWidth, y, size: 10, font: bold, color: dark });
		y -= 20;
	};

	page.drawText('PROFIT AND LOSS STATEMENT', { x: margin, y, size: 18, font: bold, color: accent });
	y -= 29;
	for (const line of wrapText(pdfText(input.businessName.trim()), bold, 12, contentWidth)) {
		page.drawText(line, { x: margin, y, size: 12, font: bold, color: dark });
		y -= 16;
	}
	page.drawText(`For ${formatPeriodDate(input.periodStart)} to ${formatPeriodDate(input.periodEnd)}`, { x: margin, y, size: 9, font: regular, color: muted });
	y -= 22;
	page.drawLine({ start: { x: margin, y }, end: { x: pageSize[0] - margin, y }, thickness: 1.5, color: accent });
	y -= 24;

	drawSectionHeading('Income');
	for (const item of input.incomeItems) drawLine(`${item.category} - ${item.description.trim()}`, item.amount);
	drawSubtotal('Total income', totals.totalIncome);

	drawSectionHeading('Expenses');
	for (const item of input.expenseItems) drawLine(`${item.category} - ${item.description.trim()}`, item.amount);
	drawSubtotal('Total expenses', totals.totalExpenses);

	ensureSpace(64);
	page.drawRectangle({ x: margin, y: y - 34, width: contentWidth, height: 48, color: rgb(0.94, 0.96, 0.93) });
	const resultLabel = totals.netProfit < 0 ? 'NET LOSS' : 'NET PROFIT';
	const resultAmount = formatProfitLossStatementAmount(Math.abs(totals.netProfit), input.currency);
	page.drawText(resultLabel, { x: margin + 12, y: y - 5, size: 8, font: bold, color: muted });
	page.drawText(resultAmount, { x: margin + 12, y: y - 25, size: 15, font: bold, color: accent });
	y -= 63;

	if (input.notes.trim()) {
		drawSectionHeading('Notes');
		for (const line of wrapText(input.notes.trim(), regular, 9, contentWidth)) {
			ensureSpace(13);
			page.drawText(line, { x: margin, y, size: 9, font: regular, color: dark });
			y -= 13;
		}
		y -= 8;
	}
	ensureSpace(28);
	page.drawText('Prepared as a simple summary from the details provided; not tax, audit, or accounting advice.', {
		x: margin, y, size: 7, font: regular, color: muted,
	});

	return document.save();
}
