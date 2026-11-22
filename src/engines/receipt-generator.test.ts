import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { calculateReceiptTotals, createReceiptDocument, type ReceiptGeneratorInput } from './receipt-generator';

const receipt: ReceiptGeneratorInput = {
	sellerName: 'Starmore Market',
	sellerDetails: '123 Market Road',
	customerName: 'Example Customer',
	customerDetails: '45 Client Street',
	receiptNumber: 'RCT-2026-001',
	receiptDate: '2026-11-22',
	currency: 'NGN',
	taxRate: 7.5,
	paymentMethod: 'Bank transfer',
	reference: 'TXN-84321',
	notes: 'Payment received with thanks.',
	items: [{ description: 'Office supplies', quantity: 2, unitPrice: 12500 }],
};

describe('receipt generator', () => {
	it('calculates amount received from items and tax', () => {
		expect(calculateReceiptTotals(receipt.items, receipt.taxRate)).toEqual({
			subtotal: 25000,
			taxAmount: 1875,
			total: 26875,
		});
	});

	it('creates a PDF receipt', async () => {
		const bytes = await createReceiptDocument(receipt);
		const document = await PDFDocument.load(bytes);
		expect(document.getPageCount()).toBe(1);
		expect(document.getPage(0).getWidth()).toBeGreaterThan(500);
	});

	it('supports long receipts across multiple PDF pages', async () => {
		const items = Array.from({ length: 50 }, (_, index) => ({
			description: `Purchased item ${index + 1}`,
			quantity: 1,
			unitPrice: 100,
		}));
		const document = await PDFDocument.load(await createReceiptDocument({ ...receipt, items }));
		expect(document.getPageCount()).toBeGreaterThan(1);
	});

	it('requires the payment method', async () => {
		expect(() => createReceiptDocument({ ...receipt, paymentMethod: ' ' })).toThrow('payment method');
	});
});
