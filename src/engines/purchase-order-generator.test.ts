import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import {
	calculatePurchaseOrderTotals,
	createPurchaseOrderDocument,
	type PurchaseOrderInput,
} from './purchase-order-generator';

const order: PurchaseOrderInput = {
	buyerName: 'Starmore Studio',
	buyerDetails: '123 Market Road',
	supplierName: 'Supply House',
	supplierDetails: '45 Supplier Avenue',
	orderNumber: 'PO-2026-001',
	orderDate: '2026-11-22',
	expectedDeliveryDate: '2026-12-05',
	deliveryAddress: 'Receiving bay, 123 Market Road',
	deliveryMethod: 'Courier',
	currency: 'NGN',
	taxRate: 7.5,
	notes: 'Please include this order number on all correspondence.',
	items: [{ description: 'Office chairs', quantity: 4, unitPrice: 35000 }],
};

describe('purchase order generator', () => {
	it('calculates the full expected order total from items and tax', () => {
		expect(calculatePurchaseOrderTotals(order.items, order.taxRate)).toEqual({
			subtotal: 140000,
			taxAmount: 10500,
			total: 150500,
		});
	});

	it('creates a PDF purchase order', async () => {
		const document = await PDFDocument.load(await createPurchaseOrderDocument(order));
		expect(document.getPageCount()).toBe(1);
		expect(document.getPage(0).getHeight()).toBeGreaterThan(800);
	});

	it('creates multiple PDF pages for long orders', async () => {
		const items = Array.from({ length: 50 }, (_, index) => ({
			description: `Order item ${index + 1}`,
			quantity: 1,
			unitPrice: 100,
		}));
		const document = await PDFDocument.load(await createPurchaseOrderDocument({ ...order, items }));
		expect(document.getPageCount()).toBeGreaterThan(1);
	});

	it('rejects expected delivery dates before the order date', async () => {
		await expect(createPurchaseOrderDocument({ ...order, expectedDeliveryDate: '2026-11-21' })).rejects.toThrow('Expected delivery cannot be earlier than the order date');
	});
});
