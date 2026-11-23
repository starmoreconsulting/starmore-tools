export const PAYSLIP_MAX_ITEMS = 50;
export const PAYSLIP_MAX_FIELD_LENGTH = 500;
export const PAYSLIP_MAX_NAME_LENGTH = 120;

export interface PayslipLineItem {
	description: string;
	amount: number;
}

export interface PayslipGeneratorInput {
	employerName: string;
	employerDetails: string;
	employeeName: string;
	employeeId: string;
	jobTitle: string;
	payPeriodStart: string;
	payPeriodEnd: string;
	payDate: string;
	currency: string;
	earnings: PayslipLineItem[];
	deductions: PayslipLineItem[];
	notes: string;
}

export interface PayslipTotals {
	grossPay: number;
	totalDeductions: number;
	netPay: number;
}

function assertTextLength(value: string, label: string, maxLength = PAYSLIP_MAX_FIELD_LENGTH): void {
	if (value.length > maxLength) {
		throw new Error(`${label} must be ${maxLength} characters or fewer.`);
	}
}

function validateDate(value: string, label: string): number {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
	if (!match) throw new Error(`Enter a valid ${label.toLowerCase()} date.`);
	const timestamp = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
	if (new Date(timestamp).toISOString().slice(0, 10) !== value) {
		throw new Error(`Enter a valid ${label.toLowerCase()} date.`);
	}
	return timestamp;
}

function calculateLineItems(items: PayslipLineItem[], label: string, allowEmpty: boolean): number {
	if ((!allowEmpty && items.length < 1) || items.length > PAYSLIP_MAX_ITEMS) {
		throw new Error(allowEmpty
			? `Add no more than ${PAYSLIP_MAX_ITEMS} ${label.toLowerCase()} line items.`
			: `Add between 1 and ${PAYSLIP_MAX_ITEMS} ${label.toLowerCase()} line items.`);
	}

	let totalCents = 0;
	for (const [index, item] of items.entries()) {
		assertTextLength(item.description, `${label} ${index + 1} description`);
		if (!item.description.trim()) throw new Error(`Enter a description for ${label.toLowerCase()} ${index + 1}.`);
		if (!Number.isFinite(item.amount) || item.amount < 0) {
			throw new Error(`${label} ${index + 1} amount must be zero or more.`);
		}
		const amountCents = Math.round(item.amount * 100);
		if (!Number.isSafeInteger(amountCents) || !Number.isSafeInteger(totalCents + amountCents)) {
			throw new Error('Payslip amounts are too large to calculate safely.');
		}
		totalCents += amountCents;
	}
	return totalCents;
}

export function calculatePayslipTotals(
	earnings: PayslipLineItem[],
	deductions: PayslipLineItem[],
): PayslipTotals {
	const grossCents = calculateLineItems(earnings, 'Earnings', false);
	const deductionCents = calculateLineItems(deductions, 'Deductions', true);
	return {
		grossPay: grossCents / 100,
		totalDeductions: deductionCents / 100,
		netPay: (grossCents - deductionCents) / 100,
	};
}

export function validatePayslipInput(input: PayslipGeneratorInput): PayslipTotals {
	const requiredNames: Array<[string, string]> = [
		[input.employerName, 'Employer name'],
		[input.employeeName, 'Worker name'],
	];
	for (const [value, label] of requiredNames) {
		if (!value.trim()) throw new Error(`${label} is required.`);
		assertTextLength(value, label, PAYSLIP_MAX_NAME_LENGTH);
	}
	assertTextLength(input.employerDetails, 'Employer details');
	assertTextLength(input.employeeId, 'Worker ID');
	assertTextLength(input.jobTitle, 'Job title');
	assertTextLength(input.notes, 'Payslip notes');

	if (validateDate(input.payPeriodEnd, 'Pay period end') < validateDate(input.payPeriodStart, 'Pay period start')) {
		throw new Error('Pay period end cannot be earlier than the start.');
	}
	validateDate(input.payDate, 'Pay date');

	if (!/^[A-Z]{3}$/.test(input.currency)) throw new Error('Choose a valid three-letter currency code.');
	try {
		new Intl.NumberFormat('en', { style: 'currency', currency: input.currency }).format(0);
	} catch {
		throw new Error('Choose a supported three-letter currency code.');
	}

	return calculatePayslipTotals(input.earnings, input.deductions);
}

export function formatPayslipMoney(value: number, currency: string): string {
	if (!Number.isFinite(value)) throw new Error('Enter a valid payslip amount.');
	if (!/^[A-Z]{3}$/.test(currency)) throw new Error('Choose a valid three-letter currency code.');
	return `${currency} ${new Intl.NumberFormat('en', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(value)}`;
}

export function sanitizePayslipText(value: string): string {
	return value
		.replace(/\r\n?/g, '\n')
		.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g, '');
}
