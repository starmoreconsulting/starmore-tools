import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { createCoverLetterPdf, validateCoverLetter, type CoverLetterInput } from './cover-letter';

const coverLetter: CoverLetterInput = {
	senderName: 'Jordan Lee',
	senderTitle: 'Product Designer',
	senderDetails: 'jordan@example.com\n+1 555 0100',
	recipientName: 'Alex Morgan',
	recipientTitle: 'Hiring Manager',
	organization: 'Northstar',
	recipientDetails: 'Toronto, Canada',
	date: '2026-11-22',
	jobTitle: 'Senior Product Designer',
	salutation: 'Dear Alex Morgan,',
	opening: 'I am writing to apply for the Senior Product Designer role.',
	body: 'My experience aligns with the product design work described in the posting.',
	closingParagraph: 'I would welcome the opportunity to discuss how I can contribute.',
	signoff: 'Sincerely,',
};

describe('cover letter builder', () => {
	it('accepts a complete letter', () => {
		expect(() => validateCoverLetter(coverLetter)).not.toThrow();
	});

	it('requires key fields and a valid date', () => {
		expect(() => validateCoverLetter({ ...coverLetter, senderName: ' ' })).toThrow('Your name is required');
		expect(() => validateCoverLetter({ ...coverLetter, opening: '' })).toThrow('Opening paragraph is required');
		expect(() => validateCoverLetter({ ...coverLetter, closingParagraph: ' ' })).toThrow('Closing paragraph is required');
		expect(() => validateCoverLetter({ ...coverLetter, date: '2026-02-30' })).toThrow('valid letter date');
	});

	it('enforces input text limits', () => {
		expect(() => validateCoverLetter({ ...coverLetter, jobTitle: 'x'.repeat(121) })).toThrow('Job title must be 120 characters or fewer');
		expect(() => validateCoverLetter({ ...coverLetter, body: 'x'.repeat(6001) })).toThrow('Letter body must be 6000 characters or fewer');
	});

	it('creates a valid multipage PDF for long cover letters', async () => {
		const bytes = await createCoverLetterPdf({ ...coverLetter, body: 'Detailed experience and results. '.repeat(130) });
		const pdf = await PDFDocument.load(bytes);
		expect(pdf.getPageCount()).toBeGreaterThan(1);
	});

	it('reports characters unsupported by the built-in PDF font', async () => {
		await expect(createCoverLetterPdf({ ...coverLetter, senderName: 'Jordan 🚀 Lee' })).rejects.toThrow('basic Latin and Western European');
	});
});
