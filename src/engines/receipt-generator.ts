import {
	calculateInvoiceGeneratorTotals,
	createReceiptPdf,
	type InvoiceGeneratorInput,
	type InvoiceGeneratorItem,
	type InvoiceGeneratorTotals,
} from './invoice-generator';

export interface ReceiptGeneratorInput {
	sellerName: string;
	sellerDetails: string;
	customerName: string;
	customerDetails: string;
	receiptNumber: string;
	receiptDate: string;
	currency: string;
	taxRate: number;
	paymentMethod: string;
	reference: string;
	notes: string;
	items: InvoiceGeneratorItem[];
}

export function calculateReceiptTotals(items: InvoiceGeneratorItem[], taxRate: number): InvoiceGeneratorTotals {
	return calculateInvoiceGeneratorTotals(items, taxRate);
}

export function createReceiptDocument(input: ReceiptGeneratorInput): Promise<Uint8Array> {
	const document: InvoiceGeneratorInput = {
		sellerName: input.sellerName,
		sellerDetails: input.sellerDetails,
		customerName: input.customerName,
		customerDetails: input.customerDetails,
		invoiceNumber: input.receiptNumber,
		issueDate: input.receiptDate,
		dueDate: input.receiptDate,
		currency: input.currency,
		taxRate: input.taxRate,
		notes: input.notes,
		items: input.items,
	};
	return createReceiptPdf(document, input.paymentMethod, input.reference);
}
