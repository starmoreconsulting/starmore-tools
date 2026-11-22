import {
	calculateInvoiceGeneratorTotals,
	createPurchaseOrderPdf,
	type InvoiceGeneratorInput,
	type InvoiceGeneratorItem,
	type InvoiceGeneratorTotals,
} from './invoice-generator';

export interface PurchaseOrderInput {
	buyerName: string;
	buyerDetails: string;
	supplierName: string;
	supplierDetails: string;
	orderNumber: string;
	orderDate: string;
	expectedDeliveryDate: string;
	deliveryAddress: string;
	deliveryMethod: string;
	currency: string;
	taxRate: number;
	notes: string;
	items: InvoiceGeneratorItem[];
}

export function calculatePurchaseOrderTotals(items: InvoiceGeneratorItem[], taxRate: number): InvoiceGeneratorTotals {
	return calculateInvoiceGeneratorTotals(items, taxRate);
}

export function createPurchaseOrderDocument(input: PurchaseOrderInput): Promise<Uint8Array> {
	const document: InvoiceGeneratorInput = {
		sellerName: input.buyerName,
		sellerDetails: input.buyerDetails,
		customerName: input.supplierName,
		customerDetails: input.supplierDetails,
		invoiceNumber: input.orderNumber,
		issueDate: input.orderDate,
		dueDate: input.expectedDeliveryDate,
		currency: input.currency,
		taxRate: input.taxRate,
		notes: input.notes,
		items: input.items,
	};
	return createPurchaseOrderPdf(document, input.deliveryAddress, input.deliveryMethod);
}
