import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { calculateQuotationTotals, createQuotationDocument, type QuotationGeneratorInput } from './quotation-generator';

const quotation: QuotationGeneratorInput = {
	sellerName: 'Starmore Media',
	sellerDetails: '123 Market Road',
	customerName: 'Example Customer',
	customerDetails: '45 Client Street',
	invoiceNumber: 'QUO-2026-001',
	issueDate: '2026-11-22',
	dueDate: '2026-12-22',
	currency: 'NGN',
	taxRate: 7.5,
	notes: 'This quotation is valid for 30 days.',
	items: [{ description: 'Consulting', quantity: 2, unitPrice: 12500 }],
};

describe('quotation generator', () => {
	it('calculates quotation totals using the shared business-document calculation', () => {
		expect(calculateQuotationTotals(quotation.items, quotation.taxRate)).toEqual({
			subtotal: 25000,
			taxAmount: 1875,
			total: 26875,
		});
	});

	it('creates a PDF quotation with multiple pages when needed', async () => {
		const items = Array.from({ length: 50 }, (_, index) => ({
			description: `Quoted service ${index + 1}`,
			quantity: 1,
			unitPrice: 100,
		}));
		const document = await PDFDocument.load(await createQuotationDocument({ ...quotation, items }));
		expect(document.getPageCount()).toBeGreaterThan(1);
	});

	it('requires the quotation expiry date to be on or after the quote date', async () => {
		await expect(createQuotationDocument({ ...quotation, dueDate: '2026-11-21' })).rejects.toThrow('Valid until cannot be earlier than the quote date');
	});
});
