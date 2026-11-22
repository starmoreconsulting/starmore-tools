import { PDFDocument, StandardFonts, rgb, type PDFFont } from 'pdf-lib';

export const BUSINESS_LETTER_MAX_NAME_LENGTH = 120;
export const BUSINESS_LETTER_MAX_DETAILS_LENGTH = 500;
export const BUSINESS_LETTER_MAX_BODY_LENGTH = 6000;

export interface BusinessLetterInput {
	senderName: string;
	senderTitle: string;
	senderDetails: string;
	recipientName: string;
	recipientTitle: string;
	recipientOrganization: string;
	recipientDetails: string;
	date: string;
	subject: string;
	salutation: string;
	body: string;
	closing: string;
	signatureName: string;
	signatureTitle: string;
}

function isValidDate(value: string): boolean {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
	if (!match) return false;
	const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
	return date.toISOString().slice(0, 10) === value;
}

function validateText(value: string, label: string, maxLength: number, required = false): void {
	if (typeof value !== 'string') throw new Error(`${label} must be text.`);
	if (required && !value.trim()) throw new Error(`${label} is required.`);
	if (value.length > maxLength) throw new Error(`${label} must be ${maxLength} characters or fewer.`);
}

export function validateBusinessLetter(input: BusinessLetterInput): void {
	validateText(input.senderName, 'Sender name', BUSINESS_LETTER_MAX_NAME_LENGTH, true);
	validateText(input.senderTitle, 'Sender title', BUSINESS_LETTER_MAX_NAME_LENGTH);
	validateText(input.senderDetails, 'Sender details', BUSINESS_LETTER_MAX_DETAILS_LENGTH);
	validateText(input.recipientName, 'Recipient name', BUSINESS_LETTER_MAX_NAME_LENGTH, true);
	validateText(input.recipientTitle, 'Recipient title', BUSINESS_LETTER_MAX_NAME_LENGTH);
	validateText(input.recipientOrganization, 'Recipient organization', BUSINESS_LETTER_MAX_NAME_LENGTH);
	validateText(input.recipientDetails, 'Recipient details', BUSINESS_LETTER_MAX_DETAILS_LENGTH);
	validateText(input.subject, 'Subject', BUSINESS_LETTER_MAX_NAME_LENGTH);
	validateText(input.salutation, 'Salutation', BUSINESS_LETTER_MAX_NAME_LENGTH, true);
	validateText(input.body, 'Letter body', BUSINESS_LETTER_MAX_BODY_LENGTH, true);
	validateText(input.closing, 'Closing', BUSINESS_LETTER_MAX_NAME_LENGTH, true);
	validateText(input.signatureName, 'Signature name', BUSINESS_LETTER_MAX_NAME_LENGTH, true);
	validateText(input.signatureTitle, 'Signature title', BUSINESS_LETTER_MAX_NAME_LENGTH);
	if (!isValidDate(input.date)) throw new Error('Enter a valid letter date.');
}

function pdfText(value: string): string {
	const text = value
		.replace(/\r\n?/g, '\n')
		.replace(/\t/g, ' ')
		.replace(/[\u2018\u2019]/g, "'")
		.replace(/[\u201c\u201d]/g, '"')
		.replace(/[\u2013\u2014]/g, '-')
		.replace(/\u2026/g, '...')
		.replace(/\u00a0/g, ' ');
	if (/[^\x20-\x7e\u00a0-\u00ff\n]/.test(text)) {
		throw new Error('PDF export supports basic Latin and Western European characters. Replace unsupported characters and try again.');
	}
	return text;
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
	const lines: string[] = [];
	for (const paragraph of pdfText(text).split('\n')) {
		if (!paragraph) {
			lines.push('');
			continue;
		}
		let line = '';
		for (const word of paragraph.split(/\s+/).filter(Boolean)) {
			let remaining = word;
			while (remaining) {
				if (font.widthOfTextAtSize(line ? `${line} ${remaining}` : remaining, size) <= maxWidth) {
					line = line ? `${line} ${remaining}` : remaining;
					remaining = '';
				} else if (line) {
					lines.push(line);
					line = '';
				} else {
					let length = 1;
					while (length < remaining.length && font.widthOfTextAtSize(remaining.slice(0, length + 1), size) <= maxWidth) length += 1;
					lines.push(remaining.slice(0, length));
					remaining = remaining.slice(length);
				}
			}
		}
		lines.push(line);
	}
	return lines.length ? lines : [''];
}

function formatDate(value: string): string {
	return new Intl.DateTimeFormat('en', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`));
}

export async function createBusinessLetterPdf(input: BusinessLetterInput): Promise<Uint8Array> {
	validateBusinessLetter(input);
	const document = await PDFDocument.create();
	const regular = await document.embedFont(StandardFonts.TimesRoman);
	const bold = await document.embedFont(StandardFonts.TimesRomanBold);
	const pageSize: [number, number] = [612, 792];
	const margin = 68;
	const contentWidth = pageSize[0] - margin * 2;
	const dark = rgb(0.13, 0.17, 0.15);
	const muted = rgb(0.39, 0.43, 0.4);
	const accent = rgb(0.12, 0.38, 0.29);
	let page = document.addPage(pageSize);
	let y = pageSize[1] - margin;
	const bottom = margin;

	const startPage = () => {
		page = document.addPage(pageSize);
		y = pageSize[1] - margin;
	};
	const ensureSpace = (height: number) => {
		if (y - height < bottom) startPage();
	};
	const drawLines = (text: string, font: PDFFont, size: number, lineHeight: number, color = dark) => {
		const lines = wrapText(text, font, size, contentWidth);
		for (const line of lines) {
			ensureSpace(line ? lineHeight : lineHeight * 0.75);
			if (line) page.drawText(line, { x: margin, y, size, font, color });
			y -= line ? lineHeight : lineHeight * 0.75;
		}
	};
	const drawGap = (height: number) => {
		ensureSpace(height);
		y -= height;
	};
	const senderLines = [
		input.senderName.trim(),
		input.senderTitle.trim(),
		...input.senderDetails.trim().split(/\r?\n/).filter(Boolean),
	].filter(Boolean);

	for (const line of senderLines) {
		ensureSpace(15);
		page.drawText(pdfText(line), {
			x: margin, y, size: line === input.senderName.trim() ? 11 : 9,
			font: line === input.senderName.trim() ? bold : regular,
			color: line === input.senderName.trim() ? accent : muted,
		});
		y -= 14;
	}
	drawGap(24);
	drawLines(formatDate(input.date), regular, 10, 14, muted);
	drawGap(22);

	for (const line of [
		input.recipientName.trim(),
		input.recipientTitle.trim(),
		input.recipientOrganization.trim(),
		...input.recipientDetails.trim().split(/\r?\n/).filter(Boolean),
	].filter(Boolean)) {
		drawLines(line, regular, 10, 14);
	}
	drawGap(18);

	if (input.subject.trim()) {
		const subjectLines = wrapText(`Subject: ${input.subject.trim()}`, bold, 10, contentWidth);
		for (const line of subjectLines) {
			ensureSpace(16);
			page.drawText(line, { x: margin, y, size: 10, font: bold, color: dark });
			y -= 15;
		}
		drawGap(12);
	}

	drawLines(input.salutation.trim(), regular, 11, 16);
	drawGap(10);
	drawLines(input.body.trim(), regular, 11, 17);
	drawGap(18);
	drawLines(input.closing.trim(), regular, 11, 16);
	drawGap(34);
	drawLines(input.signatureName.trim(), bold, 11, 15, dark);
	if (input.signatureTitle.trim()) drawLines(input.signatureTitle.trim(), regular, 10, 14, muted);

	return document.save();
}
