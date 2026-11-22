import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { createDeliveryNotePdf, type DeliveryNoteInput } from './delivery-note';

const note: DeliveryNoteInput = {
	senderName: 'Starmore Supply',
	senderDetails: '123 Market Road',
	recipientName: 'Example Customer',
	recipientDetails: '45 Client Street',
	noteNumber: 'DN-2026-001',
	dispatchDate: '2026-11-22',
	reference: 'PO-2026-014',
	carrier: 'Courier',
	deliveryAddress: 'Receiving bay, 45 Client Street',
	items: [
		{ description: 'Office chairs', quantity: 4, unit: 'pieces' },
		{ description: 'Assembly service', quantity: 1, unit: 'job' },
	],
	notes: 'Please inspect items on delivery.',
};

describe('delivery note', () => {
	it('creates a PDF delivery note with a recipient acknowledgment section', async () => {
		const pdf = await PDFDocument.load(await createDeliveryNotePdf(note));
		expect(pdf.getPageCount()).toBe(1);
		expect(pdf.getPage(0).getHeight()).toBeGreaterThan(800);
	});

	it('supports long item lists across multiple pages', async () => {
		const items = Array.from({ length: 50 }, (_, index) => ({
			description: `Delivered item ${index + 1}`,
			quantity: index + 1,
			unit: 'pieces',
		}));
		const pdf = await PDFDocument.load(await createDeliveryNotePdf({ ...note, items }));
		expect(pdf.getPageCount()).toBeGreaterThan(1);
	});

	it('requires the sender, recipient, note number, a valid date, and at least one valid item', async () => {
		await expect(createDeliveryNotePdf({ ...note, recipientName: ' ' })).rejects.toThrow('Recipient name is required');
		await expect(createDeliveryNotePdf({ ...note, dispatchDate: '2026-02-30' })).rejects.toThrow('valid dispatch date');
		await expect(createDeliveryNotePdf({ ...note, items: [] })).rejects.toThrow('between 1 and 50 delivery items');
		await expect(createDeliveryNotePdf({ ...note, items: [{ description: 'Box', quantity: 0, unit: 'box' }] })).rejects.toThrow('greater than zero');
	});

	it('does not silently replace unsupported PDF characters', async () => {
		await expect(createDeliveryNotePdf({ ...note, recipientName: 'Customer 東京' })).rejects.toThrow('supports basic Latin and Western European characters');
	});
});
