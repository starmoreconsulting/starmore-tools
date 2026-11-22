import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import {
	calculateInvoiceGeneratorTotals,
	createInvoicePdf,
	formatInvoiceMoney,
	type InvoiceGeneratorInput,
} from './invoice-generator';

const sampleInvoice: InvoiceGeneratorInput = {
	sellerName: 'Starmore Media',
	sellerDetails: '123 Market Road\nLagos, Nigeria',
	customerName: 'Example Customer',
	customerDetails: '45 Client Street',
	invoiceNumber: 'INV-2026-001',
	issueDate: '2026-11-22',
	dueDate: '2026-12-22',
	currency: 'NGN',
	taxRate: 7.5,
	notes: 'Thank you for your business.',
	items: [
		{ description: 'Consulting', quantity: 2, unitPrice: 12500 },
		{ description: 'Research', quantity: 1, unitPrice: 5000 },
	],
};

describe('invoice generator', () => {
	it('calculates line items, subtotal, tax, and total using currency precision', () => {
		expect(calculateInvoiceGeneratorTotals(sampleInvoice.items, sampleInvoice.taxRate)).toEqual({
			subtotal: 30000,
			taxAmount: 2250,
			total: 32250,
		});
		expect(calculateInvoiceGeneratorTotals([{ description: 'Fractional units', quantity: 3, unitPrice: 0.335 }], 0).subtotal).toBe(1.01);
	});

	it('formats monetary values with an explicit ISO currency code', () => {
		expect(formatInvoiceMoney(1250, 'NGN')).toBe('NGN 1,250.00');
		expect(() => formatInvoiceMoney(1, 'NAIRA')).toThrow('three-letter currency code');
	});

	it('creates a readable PDF with invoice information and totals', async () => {
		const bytes = await createInvoicePdf(sampleInvoice);
		const pdf = await PDFDocument.load(bytes);
		expect(pdf.getPageCount()).toBe(1);
		expect(bytes.length).toBeGreaterThan(500);
	});

	it('creates multiple PDF pages for long invoice item lists', async () => {
		const items = Array.from({ length: 50 }, (_, index) => ({
			description: `Service line ${index + 1}`,
			quantity: 1,
			unitPrice: 100,
		}));
		const bytes = await createInvoicePdf({ ...sampleInvoice, items });
		expect((await PDFDocument.load(bytes)).getPageCount()).toBeGreaterThan(1);
	});

	it('rejects invalid invoice details, dates, tax, and item values', async () => {
		expect(() => calculateInvoiceGeneratorTotals(sampleInvoice.items, 101)).toThrow('between 0 and 100%');
		expect(() => calculateInvoiceGeneratorTotals([{ description: 'Item', quantity: 0, unitPrice: 10 }], 0)).toThrow('greater than zero');
		await expect(createInvoicePdf({ ...sampleInvoice, dueDate: '2026-11-21' })).rejects.toThrow('cannot be earlier');
		await expect(createInvoicePdf({ ...sampleInvoice, customerName: ' ' })).rejects.toThrow('Customer name is required');
	});

	it('reports characters unsupported by the embedded PDF fonts instead of replacing them', async () => {
		await expect(createInvoicePdf({ ...sampleInvoice, customerName: 'Example 東京' })).rejects.toThrow('supports basic Latin and Western European characters');
	});
});
