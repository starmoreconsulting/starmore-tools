import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import {
	createBusinessLetterPdf,
	validateBusinessLetter,
	type BusinessLetterInput,
} from './business-letter';

const letter: BusinessLetterInput = {
	senderName: 'Alex Morgan',
	senderTitle: 'Operations Manager',
	senderDetails: 'Starmore Studio\n123 Market Road\nLagos, Nigeria',
	recipientName: 'Jordan Lee',
	recipientTitle: 'Procurement Manager',
	recipientOrganization: 'Example Company',
	recipientDetails: '45 Client Street\nAbuja, Nigeria',
	date: '2026-11-22',
	subject: 'Request for a project discussion',
	salutation: 'Dear Jordan,',
	body: 'I am writing to discuss a potential project.\n\nPlease let me know a suitable time for a meeting.',
	closing: 'Yours sincerely,',
	signatureName: 'Alex Morgan',
	signatureTitle: 'Operations Manager',
};

describe('business letter', () => {
	it('accepts a complete formal letter', () => {
		expect(() => validateBusinessLetter(letter)).not.toThrow();
	});

	it('requires the sender, recipient, salutation, body, closing, and sign-off', () => {
		expect(() => validateBusinessLetter({ ...letter, senderName: '' })).toThrow('Sender name is required');
		expect(() => validateBusinessLetter({ ...letter, recipientName: ' ' })).toThrow('Recipient name is required');
		expect(() => validateBusinessLetter({ ...letter, salutation: '' })).toThrow('Salutation is required');
		expect(() => validateBusinessLetter({ ...letter, body: '' })).toThrow('Letter body is required');
		expect(() => validateBusinessLetter({ ...letter, closing: '' })).toThrow('Closing is required');
		expect(() => validateBusinessLetter({ ...letter, signatureName: '' })).toThrow('Signature name is required');
	});

	it('validates the date and enforces text limits', () => {
		expect(() => validateBusinessLetter({ ...letter, date: '2026-02-30' })).toThrow('valid letter date');
		expect(() => validateBusinessLetter({ ...letter, body: 'a'.repeat(6001) })).toThrow('6000 characters or fewer');
		expect(() => validateBusinessLetter({ ...letter, subject: 'a'.repeat(121) })).toThrow('120 characters or fewer');
	});

	it('creates a letter PDF and supports multiple pages', async () => {
		const document = await PDFDocument.load(await createBusinessLetterPdf(letter));
		expect(document.getPageCount()).toBe(1);
		const longBody = `${'This is a paragraph in a detailed business letter. '.repeat(22)}\n\n`.repeat(4);
		const multipage = await PDFDocument.load(await createBusinessLetterPdf({ ...letter, body: longBody }));
		expect(multipage.getPageCount()).toBeGreaterThan(1);
	});

	it('reports characters unsupported by the standard PDF font', async () => {
		await expect(createBusinessLetterPdf({ ...letter, recipientName: 'Client 東京' })).rejects.toThrow('supports basic Latin');
	});
});
