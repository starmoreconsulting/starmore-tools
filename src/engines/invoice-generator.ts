import { PDFDocument, StandardFonts, rgb, type PDFFont } from 'pdf-lib';

export const INVOICE_GENERATOR_MAX_ITEMS = 50;
export const INVOICE_GENERATOR_MAX_FIELD_LENGTH = 500;
export const INVOICE_GENERATOR_MAX_NAME_LENGTH = 120;
export const INVOICE_GENERATOR_MAX_NUMBER_LENGTH = 80;

export interface InvoiceGeneratorItem {
	description: string;
	quantity: number;
	unitPrice: number;
}

export interface InvoiceGeneratorInput {
	sellerName: string;
	sellerDetails: string;
	customerName: string;
	customerDetails: string;
	invoiceNumber: string;
	issueDate: string;
	dueDate: string;
	currency: string;
	taxRate: number;
	notes: string;
	items: InvoiceGeneratorItem[];
}

export interface InvoiceGeneratorTotals {
	subtotal: number;
	taxAmount: number;
	total: number;
}

interface BusinessDocumentLabels {
	title: string;
	number: string;
	date: string;
	expiry?: string;
	details: string;
	total: string;
	notes: string;
	firstParty: string;
	sender: string;
}

const invoiceLabels: BusinessDocumentLabels = {
	title: 'INVOICE',
	number: 'Invoice number',
	date: 'Issue date',
	expiry: 'Due date',
	details: 'INVOICE DETAILS',
	total: 'TOTAL DUE',
	notes: 'NOTES / PAYMENT DETAILS',
	firstParty: 'BILL TO',
	sender: 'FROM',
};

const quotationLabels: BusinessDocumentLabels = {
	title: 'QUOTATION',
	number: 'Quote number',
	date: 'Quote date',
	expiry: 'Valid until',
	details: 'QUOTE DETAILS',
	total: 'TOTAL QUOTED',
	notes: 'NOTES / TERMS',
	firstParty: 'PREPARED FOR',
	sender: 'PREPARED BY',
};

function assertTextLength(value: string, label: string): void {
	if (value.length > INVOICE_GENERATOR_MAX_FIELD_LENGTH) {
		throw new Error(`${label} must be ${INVOICE_GENERATOR_MAX_FIELD_LENGTH} characters or fewer.`);
	}
}

function validateDate(value: string, label: string): number {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
	if (!match) throw new Error(`Enter a valid ${label.toLowerCase()} date.`);
	const timestamp = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
	const date = new Date(timestamp);
	if (date.toISOString().slice(0, 10) !== value) throw new Error(`Enter a valid ${label.toLowerCase()} date.`);
	return timestamp;
}

export function calculateInvoiceGeneratorTotals(
	items: InvoiceGeneratorItem[],
	taxRate: number,
): InvoiceGeneratorTotals {
	if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100) {
		throw new Error('Tax rate must be between 0 and 100%.');
	}
	if (items.length < 1 || items.length > INVOICE_GENERATOR_MAX_ITEMS) {
		throw new Error(`Add between 1 and ${INVOICE_GENERATOR_MAX_ITEMS} document line items.`);
	}
	let subtotalCents = 0;
	for (const [index, item] of items.entries()) {
		assertTextLength(item.description, `Item ${index + 1} description`);
		if (!item.description.trim()) throw new Error(`Enter a description for item ${index + 1}.`);
		if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
			throw new Error(`Item ${index + 1} quantity must be greater than zero.`);
		}
		if (!Number.isFinite(item.unitPrice) || item.unitPrice < 0) {
			throw new Error(`Item ${index + 1} unit price must be zero or more.`);
		}
		const amountCents = Math.round(item.quantity * item.unitPrice * 100);
		if (!Number.isSafeInteger(amountCents) || amountCents < 0 || !Number.isSafeInteger(subtotalCents + amountCents)) {
			throw new Error('Invoice amounts are too large to calculate safely.');
		}
		subtotalCents += amountCents;
	}
	const taxCents = Math.round(subtotalCents * taxRate / 100);
	if (!Number.isSafeInteger(taxCents) || !Number.isSafeInteger(subtotalCents + taxCents)) {
		throw new Error('Invoice amounts are too large to calculate safely.');
	}
	return {
		subtotal: subtotalCents / 100,
		taxAmount: taxCents / 100,
		total: (subtotalCents + taxCents) / 100,
	};
}

export function formatInvoiceMoney(value: number, currency: string): string {
	if (!Number.isFinite(value)) throw new Error('Enter a valid invoice amount.');
	if (!/^[A-Z]{3}$/.test(currency)) throw new Error('Choose a valid three-letter currency code.');
	try {
		return `${currency} ${new Intl.NumberFormat('en', {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		}).format(value)}`;
	} catch {
		throw new Error('Choose a supported three-letter currency code.');
	}
}

function printableText(value: string): string {
	const text = value
		.replace(/\r\n?/g, '\n')
		.replace(/\t/g, ' ')
		.replace(/[\u2018\u2019]/g, "'")
		.replace(/[\u201c\u201d]/g, '"')
		.replace(/[\u2013\u2014]/g, '-')
		.replace(/\u2026/g, '...')
		.replace(/[\u00a0]/g, ' ');
	if (/[^\x20-\x7e\u00a0-\u00ff\n]/.test(text)) {
		throw new Error('PDF export supports basic Latin and Western European characters. Replace unsupported characters in your invoice details and try again.');
	}
	return text;
}

function wrapPdfText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
	const output: string[] = [];
	for (const paragraph of printableText(text).split(/\r?\n/)) {
		let line = '';
		for (const word of paragraph.split(/\s+/).filter(Boolean)) {
			let remaining = word;
			while (remaining) {
				const fitting = line ? `${line} ${remaining}` : remaining;
				if (font.widthOfTextAtSize(fitting, size) <= maxWidth) {
					line = fitting;
					remaining = '';
					continue;
				}
				if (line) {
					output.push(line);
					line = '';
					continue;
				}
				let length = 1;
				while (length < remaining.length && font.widthOfTextAtSize(remaining.slice(0, length + 1), size) <= maxWidth) length += 1;
				output.push(remaining.slice(0, length));
				remaining = remaining.slice(length);
			}
		}
		output.push(line);
	}
	return output.length ? output : [''];
}

function drawWrapped(
	page: ReturnType<PDFDocument['addPage']>,
	text: string,
	x: number,
	y: number,
	maxWidth: number,
	font: PDFFont,
	size: number,
	color = rgb(0.16, 0.19, 0.17),
): number {
	const lines = wrapPdfText(text, font, size, maxWidth);
	let currentY = y;
	for (const line of lines) {
		page.drawText(line, { x, y: currentY, size, font, color });
		currentY -= size + 3;
	}
	return currentY;
}

function formatPdfDate(value: string): string {
	const date = new Date(`${value}T00:00:00Z`);
	return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeZone: 'UTC' }).format(date);
}

function validateInvoice(input: InvoiceGeneratorInput, labels: BusinessDocumentLabels): InvoiceGeneratorTotals {
	const required: Array<[string, string, number]> = [
		[input.sellerName, 'Your business name', INVOICE_GENERATOR_MAX_NAME_LENGTH],
		[input.customerName, 'Customer name', INVOICE_GENERATOR_MAX_NAME_LENGTH],
		[input.invoiceNumber, 'Invoice number', INVOICE_GENERATOR_MAX_NUMBER_LENGTH],
		[input.currency, 'Currency code', INVOICE_GENERATOR_MAX_FIELD_LENGTH],
	];
	for (const [value, label, maxLength] of required) {
		if (!value.trim()) throw new Error(`${label} is required.`);
		if (value.length > maxLength) throw new Error(`${label} must be ${maxLength} characters or fewer.`);
	}
	assertTextLength(input.sellerDetails, 'Your business details');
	assertTextLength(input.customerDetails, 'Customer details');
	assertTextLength(input.notes, 'Document notes');
	if (!/^[A-Z]{3}$/.test(input.currency)) throw new Error('Choose a valid three-letter currency code.');
	if (validateDate(input.dueDate, 'Due') < validateDate(input.issueDate, 'Issue')) {
		throw new Error(`${labels.expiry ?? 'Expiry date'} cannot be earlier than the ${labels.date.toLowerCase()}.`);
	}
	return calculateInvoiceGeneratorTotals(input.items, input.taxRate);
}

async function createBusinessDocumentPdf(
	input: InvoiceGeneratorInput,
	labels: BusinessDocumentLabels,
	extraDetails: Array<{ label: string; value: string }> = [],
): Promise<Uint8Array> {
	const totals = validateInvoice(input, labels);
	for (const detail of extraDetails) {
		assertTextLength(detail.label, 'Document detail label');
		assertTextLength(detail.value, detail.label);
	}
	const document = await PDFDocument.create();
	const regular = await document.embedFont(StandardFonts.Helvetica);
	const bold = await document.embedFont(StandardFonts.HelveticaBold);
	const pageSize: [number, number] = [595.28, 841.89];
	const margin = 44;
	const contentWidth = pageSize[0] - margin * 2;
	const dark = rgb(0.12, 0.18, 0.15);
	const muted = rgb(0.39, 0.43, 0.4);
	const accent = rgb(0.12, 0.38, 0.29);
	const lineColor = rgb(0.84, 0.87, 0.83);
	let page = document.addPage(pageSize);
	let y = pageSize[1] - margin;
	const headerY = y;
	const newPage = () => {
		page = document.addPage(pageSize);
		y = pageSize[1] - margin;
	};

	page.drawText(labels.sender, { x: margin, y: headerY - 11, size: 8, font: bold, color: muted });
	y = drawWrapped(page, input.sellerName.trim(), margin, headerY - 29, contentWidth * 0.58, bold, 20, accent);
	page.drawText(labels.title, { x: pageSize[0] - margin - bold.widthOfTextAtSize(labels.title, 20), y: headerY, size: 20, font: bold, color: dark });
	y = pageSize[1] - margin - 28;
	for (const line of input.sellerDetails.split(/\r?\n/).filter(Boolean)) {
		y = drawWrapped(page, line, margin, y, contentWidth * 0.58, regular, 9, muted);
	}
	y -= 10;

	page.drawLine({ start: { x: margin, y }, end: { x: pageSize[0] - margin, y }, thickness: 1.5, color: accent });
	y -= 25;
	page.drawText(labels.firstParty, { x: margin, y, size: 8, font: bold, color: muted });
	page.drawText(labels.details, { x: pageSize[0] / 2, y, size: 8, font: bold, color: muted });
	y -= 16;
	y = drawWrapped(page, input.customerName.trim(), margin, y, contentWidth * 0.45, bold, 11, dark);
	for (const line of input.customerDetails.split(/\r?\n/).filter(Boolean)) {
		y = drawWrapped(page, line, margin, y, contentWidth * 0.45, regular, 9, muted);
	}
	const detailX = pageSize[0] / 2;
	const detailWidth = pageSize[0] - margin - detailX;
	let detailY = pageSize[1] - margin - 69;
	detailY = drawWrapped(page, `${labels.number}: ${input.invoiceNumber.trim()}`, detailX, detailY, detailWidth, regular, 9, dark);
	detailY = drawWrapped(page, `${labels.date}: ${formatPdfDate(input.issueDate)}`, detailX, detailY, detailWidth, regular, 9, dark);
	if (labels.expiry) {
		detailY = drawWrapped(page, `${labels.expiry}: ${formatPdfDate(input.dueDate)}`, detailX, detailY, detailWidth, regular, 9, dark);
	}
	for (const detail of extraDetails) {
		detailY = drawWrapped(page, `${detail.label}: ${detail.value}`, detailX, detailY, detailWidth, regular, 9, dark);
	}
	y = Math.min(y, detailY - 4);
	y -= 8;

	const columns = {
		description: margin + 6,
		quantity: margin + contentWidth * 0.61,
		unitPrice: margin + contentWidth * 0.73,
		amount: margin + contentWidth * 0.86,
	};
	const drawTableHeader = () => {
		page.drawRectangle({ x: margin, y: y - 6, width: contentWidth, height: 23, color: rgb(0.94, 0.96, 0.93) });
		page.drawText('DESCRIPTION', { x: columns.description, y: y + 2, size: 7, font: bold, color: muted });
		page.drawText('QTY', { x: columns.quantity, y: y + 2, size: 7, font: bold, color: muted });
		page.drawText('UNIT PRICE', { x: columns.unitPrice, y: y + 2, size: 7, font: bold, color: muted });
		page.drawText('AMOUNT', { x: columns.amount, y: y + 2, size: 7, font: bold, color: muted });
		y -= 24;
	};
	drawTableHeader();

	for (const item of input.items) {
		const descriptionLines = wrapPdfText(item.description, regular, 9, columns.quantity - columns.description - 12);
		const rowHeight = Math.max(22, descriptionLines.length * 12 + 10);
		if (y - rowHeight < margin + 110) {
			newPage();
			drawTableHeader();
		}
		let descriptionY = y;
		for (const line of descriptionLines) {
			page.drawText(line, { x: columns.description, y: descriptionY, size: 9, font: regular, color: dark });
			descriptionY -= 12;
		}
		const quantityText = String(item.quantity);
		const unitPriceText = formatInvoiceMoney(item.unitPrice, input.currency);
		const amountText = formatInvoiceMoney(Math.round(item.quantity * item.unitPrice * 100) / 100, input.currency);
		const drawRightAligned = (text: string, right: number) => page.drawText(text, {
			x: right - regular.widthOfTextAtSize(text, 8),
			y,
			size: 8,
			font: regular,
			color: dark,
		});
		drawRightAligned(quantityText, columns.unitPrice - 10);
		drawRightAligned(unitPriceText, columns.amount - 8);
		drawRightAligned(amountText, pageSize[0] - margin - 4);
		y -= rowHeight;
		page.drawLine({ start: { x: margin, y: y + 5 }, end: { x: pageSize[0] - margin, y: y + 5 }, thickness: 0.6, color: lineColor });
	}

	if (y < margin + 115) newPage();
	y -= 7;
	const totalsX = margin + contentWidth * 0.56;
	const totalsValueRight = pageSize[0] - margin;
	const drawTotal = (label: string, value: string, isFinal = false) => {
		const font = isFinal ? bold : regular;
		const size = isFinal ? 12 : 9;
		page.drawText(label, { x: totalsX, y, size, font, color: isFinal ? accent : muted });
		page.drawText(value, { x: totalsValueRight - font.widthOfTextAtSize(value, size), y, size, font, color: isFinal ? accent : dark });
		y -= isFinal ? 22 : 16;
	};
	drawTotal('Subtotal', formatInvoiceMoney(totals.subtotal, input.currency));
	drawTotal(`Tax (${input.taxRate.toFixed(2).replace(/\.?0+$/, '')}%)`, formatInvoiceMoney(totals.taxAmount, input.currency));
	drawTotal(labels.total, formatInvoiceMoney(totals.total, input.currency), true);

	if (input.notes.trim()) {
		if (y < margin + 50) newPage();
		y -= 8;
		page.drawText(labels.notes, { x: margin, y, size: 8, font: bold, color: muted });
		y -= 15;
		for (const paragraph of input.notes.split(/\r?\n/)) {
			y = drawWrapped(page, paragraph, margin, y, contentWidth, regular, 9, dark);
		}
	}

	for (const [index, invoicePage] of document.getPages().entries()) {
		invoicePage.drawLine({
			start: { x: margin, y: margin - 12 },
			end: { x: pageSize[0] - margin, y: margin - 12 },
			thickness: 0.6,
			color: lineColor,
		});
		invoicePage.drawText(`${printableText(input.invoiceNumber.trim())}  -  Page ${index + 1} of ${document.getPageCount()}`, {
			x: margin,
			y: margin - 27,
			size: 8,
			font: regular,
			color: muted,
		});
	}

	return document.save();
}

export function createInvoicePdf(input: InvoiceGeneratorInput): Promise<Uint8Array> {
	return createBusinessDocumentPdf(input, invoiceLabels);
}

export function createQuotationPdf(input: InvoiceGeneratorInput): Promise<Uint8Array> {
	return createBusinessDocumentPdf(input, quotationLabels);
}

export function createReceiptPdf(
	input: InvoiceGeneratorInput,
	paymentMethod: string,
	reference: string,
): Promise<Uint8Array> {
	if (!paymentMethod.trim()) throw new Error('Choose a payment method.');
	if (paymentMethod.length > INVOICE_GENERATOR_MAX_FIELD_LENGTH) throw new Error('Payment method must be 500 characters or fewer.');
	if (reference.length > INVOICE_GENERATOR_MAX_FIELD_LENGTH) throw new Error('Payment reference must be 500 characters or fewer.');
	const labels: BusinessDocumentLabels = {
		title: 'RECEIPT',
		number: 'Receipt number',
		date: 'Payment date',
		details: 'PAYMENT DETAILS',
		total: 'AMOUNT RECEIVED',
		notes: 'NOTES',
		firstParty: 'RECEIVED FROM',
		sender: 'PAID TO',
	};
	const extraDetails = [{ label: 'Payment method', value: paymentMethod.trim() }];
	if (reference.trim()) extraDetails.push({ label: 'Payment reference', value: reference.trim() });
	return createBusinessDocumentPdf(input, labels, extraDetails);
}

export function createPurchaseOrderPdf(
	input: InvoiceGeneratorInput,
	deliveryAddress: string,
	deliveryMethod: string,
): Promise<Uint8Array> {
	assertTextLength(deliveryAddress, 'Delivery address');
	assertTextLength(deliveryMethod, 'Delivery method');
	const labels: BusinessDocumentLabels = {
		title: 'PURCHASE ORDER',
		number: 'Order number',
		date: 'Order date',
		expiry: 'Expected delivery',
		details: 'ORDER DETAILS',
		total: 'ORDER TOTAL',
		notes: 'ORDER NOTES / TERMS',
		firstParty: 'SUPPLIER',
		sender: 'ORDERED BY',
	};
	return createBusinessDocumentPdf(input, labels, [
		{ label: 'Deliver to', value: deliveryAddress.trim() || 'As agreed with supplier' },
		{ label: 'Delivery method', value: deliveryMethod.trim() || 'As agreed' },
	]);
}
