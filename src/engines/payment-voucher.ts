import { PDFDocument, StandardFonts, rgb, type PDFFont } from 'pdf-lib';

export const PAYMENT_VOUCHER_MAX_TEXT_LENGTH = 240;
export const PAYMENT_VOUCHER_CURRENCIES = ['NGN', 'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'GHS', 'KES', 'ZAR', 'INR'] as const;
export type PaymentVoucherCurrency = (typeof PAYMENT_VOUCHER_CURRENCIES)[number];

export interface PaymentVoucherInput {
	organization: string;
	organizationDetails: string;
	payee: string;
	payeeDetails: string;
	voucherNumber: string;
	voucherDate: string;
	amount: number;
	currency: PaymentVoucherCurrency;
	paymentMethod: string;
	paymentReference: string;
	accountCode: string;
	purpose: string;
	notes: string;
	preparedBy: string;
	approvedBy: string;
}

export function formatPaymentVoucherAmount(amount: number, currency: string): string {
	if (!Number.isFinite(amount) || amount < 0) throw new Error('Enter a valid payment amount.');
	if (!PAYMENT_VOUCHER_CURRENCIES.includes(currency as PaymentVoucherCurrency)) {
		throw new Error('Choose a supported currency.');
	}
	return `${currency} ${new Intl.NumberFormat('en', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(amount)}`;
}

function validateDate(value: string): void {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
	if (!match) throw new Error('Enter a valid voucher date.');
	const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
	if (date.toISOString().slice(0, 10) !== value) throw new Error('Enter a valid voucher date.');
}

function validateText(value: string, label: string, required = false): void {
	if (required && !value.trim()) throw new Error(`${label} is required.`);
	if (value.length > PAYMENT_VOUCHER_MAX_TEXT_LENGTH) {
		throw new Error(`${label} must be ${PAYMENT_VOUCHER_MAX_TEXT_LENGTH} characters or fewer.`);
	}
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
		throw new Error('PDF export supports basic Latin and Western European characters. Replace unsupported characters in your voucher and try again.');
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

function formatDate(value: string): string {
	return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`));
}

function validateInput(input: PaymentVoucherInput): void {
	validateText(input.organization, 'Organization name', true);
	validateText(input.payee, 'Payee name', true);
	validateText(input.voucherNumber, 'Voucher number', true);
	validateText(input.paymentMethod, 'Payment method', true);
	validateText(input.purpose, 'Payment purpose', true);
	validateText(input.organizationDetails, 'Organization details');
	validateText(input.payeeDetails, 'Payee details');
	validateText(input.paymentReference, 'Payment reference');
	validateText(input.accountCode, 'Account or cost code');
	validateText(input.notes, 'Voucher notes');
	validateText(input.preparedBy, 'Prepared by');
	validateText(input.approvedBy, 'Approved by');
	validateDate(input.voucherDate);
	formatPaymentVoucherAmount(input.amount, input.currency);
	if (input.amount <= 0) throw new Error('Payment amount must be greater than zero.');
}

export async function createPaymentVoucherPdf(input: PaymentVoucherInput): Promise<Uint8Array> {
	validateInput(input);
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
	const page = document.addPage(pageSize);
	let y = pageSize[1] - margin;
	const drawLabel = (label: string, x: number, top: number, width: number) => {
		page.drawText(label.toUpperCase(), { x, y: top, size: 7, font: bold, color: muted });
		const lines = wrapText(label, bold, 7, width);
		return top - lines.length * 9 - 5;
	};
	const drawField = (label: string, value: string, x: number, top: number, width: number): number => {
		const valueLines = wrapText(value.trim() || '-', regular, 9, width);
		let nextY = drawLabel(label, x, top, width);
		for (const line of valueLines) {
			page.drawText(line, { x, y: nextY, size: 9, font: regular, color: dark });
			nextY -= 12;
		}
		return nextY - 10;
	};

	page.drawText('PAYMENT VOUCHER', { x: margin, y, size: 20, font: bold, color: accent });
	const numberText = pdfText(input.voucherNumber.trim());
	page.drawText(numberText, {
		x: pageSize[0] - margin - bold.widthOfTextAtSize(numberText, 11),
		y: y - 2,
		size: 11,
		font: bold,
		color: dark,
	});
	y -= 31;
	page.drawLine({ start: { x: margin, y }, end: { x: pageSize[0] - margin, y }, thickness: 1.5, color: accent });
	y -= 22;

	const halfWidth = contentWidth * 0.44;
	page.drawText('PAYMENT FROM', { x: margin, y, size: 8, font: bold, color: muted });
	page.drawText('PAYMENT TO', { x: pageSize[0] / 2, y, size: 8, font: bold, color: muted });
	y -= 16;
	const leftY = drawField('Organization', input.organization, margin, y, halfWidth);
	const rightY = drawField('Payee', input.payee, pageSize[0] / 2, y, halfWidth);
	const leftDetailsY = drawField('Organization details', input.organizationDetails, margin, leftY, halfWidth);
	const rightDetailsY = drawField('Payee details', input.payeeDetails, pageSize[0] / 2, rightY, halfWidth);
	y = Math.min(leftDetailsY, rightDetailsY) - 4;

	page.drawRectangle({ x: margin, y: y - 35, width: contentWidth, height: 48, color: rgb(0.94, 0.96, 0.93) });
	page.drawText('PAYMENT AMOUNT', { x: margin + 12, y: y - 5, size: 8, font: bold, color: muted });
	const amountText = formatPaymentVoucherAmount(input.amount, input.currency);
	page.drawText(amountText, { x: margin + 12, y: y - 25, size: 16, font: bold, color: accent });
	y -= 65;

	const columnGap = 20;
	const columnWidth = (contentWidth - columnGap) / 2;
	const rightX = margin + columnWidth + columnGap;
	let leftColumnY = y;
	let rightColumnY = y;
	leftColumnY = drawField('Voucher date', formatDate(input.voucherDate), margin, leftColumnY, columnWidth);
	leftColumnY = drawField('Payment method', input.paymentMethod, margin, leftColumnY, columnWidth);
	leftColumnY = drawField('Payment reference', input.paymentReference, margin, leftColumnY, columnWidth);
	leftColumnY = drawField('Account / cost code', input.accountCode, margin, leftColumnY, columnWidth);
	rightColumnY = drawField('Purpose of payment', input.purpose, rightX, rightColumnY, columnWidth);
	y = Math.min(leftColumnY, rightColumnY) - 2;

	if (input.notes.trim()) y = drawField('Additional notes', input.notes, margin, y, contentWidth);
	y -= 14;
	page.drawLine({ start: { x: margin, y }, end: { x: pageSize[0] - margin, y }, thickness: 0.6, color: lineColor });
	y -= 18;

	const signatureWidth = (contentWidth - 24) / 3;
	const signatureY = y;
	const signatures = [
		{ label: 'Prepared by', value: input.preparedBy },
		{ label: 'Approved by', value: input.approvedBy },
		{ label: 'Payment processed by', value: '' },
	];
	signatures.forEach((signature, index) => {
		const x = margin + index * (signatureWidth + 12);
		let currentY = signatureY;
		page.drawText(signature.label.toUpperCase(), { x, y: currentY, size: 7, font: bold, color: muted });
		currentY -= 12;
		if (signature.value) {
			const preparedByLines = wrapText(signature.value, regular, 9, signatureWidth);
			for (const line of preparedByLines) {
				page.drawText(line, { x, y: currentY, size: 9, font: regular, color: dark });
				currentY -= 11;
			}
		}
		page.drawLine({ start: { x, y: currentY - 5 }, end: { x: x + signatureWidth, y: currentY - 5 }, thickness: 0.6, color: lineColor });
	});

	page.drawText('Internal payment documentation only. This voucher does not verify that funds were transferred or cleared.', {
		x: margin,
		y: margin - 10,
		size: 7,
		font: regular,
		color: muted,
		maxWidth: contentWidth,
	});
	page.drawLine({
		start: { x: margin, y: margin + 2 },
		end: { x: pageSize[0] - margin, y: margin + 2 },
		thickness: 0.6,
		color: lineColor,
	});
	return document.save();
}
