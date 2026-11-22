import { PDFDocument, StandardFonts, rgb, type PDFFont } from 'pdf-lib';

export const COMPANY_PROFILE_MAX_NAME_LENGTH = 120;
export const COMPANY_PROFILE_MAX_TEXT_LENGTH = 2000;
export const COMPANY_PROFILE_MAX_YEAR = new Date().getFullYear() + 10;

export interface CompanyProfileInput {
	companyName: string;
	tagline: string;
	industry: string;
	foundedYear: number | null;
	headquarters: string;
	website: string;
	email: string;
	phone: string;
	overview: string;
	mission: string;
	vision: string;
	values: string;
	services: string;
	market: string;
	differentiators: string;
}

function validateText(value: string, label: string, maxLength: number, required = false): void {
	if (typeof value !== 'string') throw new Error(`${label} must be text.`);
	if (required && !value.trim()) throw new Error(`${label} is required.`);
	if (value.length > maxLength) throw new Error(`${label} must be ${maxLength} characters or fewer.`);
}

export function validateCompanyProfile(input: CompanyProfileInput): void {
	validateText(input.companyName, 'Company name', COMPANY_PROFILE_MAX_NAME_LENGTH, true);
	validateText(input.tagline, 'Tagline', COMPANY_PROFILE_MAX_NAME_LENGTH);
	validateText(input.industry, 'Industry', COMPANY_PROFILE_MAX_NAME_LENGTH);
	validateText(input.headquarters, 'Headquarters', COMPANY_PROFILE_MAX_NAME_LENGTH);
	validateText(input.website, 'Website', COMPANY_PROFILE_MAX_NAME_LENGTH);
	validateText(input.email, 'Email', COMPANY_PROFILE_MAX_NAME_LENGTH);
	validateText(input.phone, 'Phone', COMPANY_PROFILE_MAX_NAME_LENGTH);
	validateText(input.overview, 'Company overview', COMPANY_PROFILE_MAX_TEXT_LENGTH, true);
	validateText(input.mission, 'Mission', COMPANY_PROFILE_MAX_TEXT_LENGTH);
	validateText(input.vision, 'Vision', COMPANY_PROFILE_MAX_TEXT_LENGTH);
	validateText(input.values, 'Values', COMPANY_PROFILE_MAX_TEXT_LENGTH);
	validateText(input.services, 'Products and services', COMPANY_PROFILE_MAX_TEXT_LENGTH);
	validateText(input.market, 'Markets and clients', COMPANY_PROFILE_MAX_TEXT_LENGTH);
	validateText(input.differentiators, 'What sets us apart', COMPANY_PROFILE_MAX_TEXT_LENGTH);
	if (input.foundedYear !== null
		&& (!Number.isInteger(input.foundedYear) || input.foundedYear < 1800 || input.foundedYear > COMPANY_PROFILE_MAX_YEAR)) {
		throw new Error(`Founded year must be between 1800 and ${COMPANY_PROFILE_MAX_YEAR}.`);
	}
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

function drawWrappedText(
	page: ReturnType<PDFDocument['addPage']>,
	text: string,
	x: number,
	y: number,
	maxWidth: number,
	font: PDFFont,
	size: number,
	color: ReturnType<typeof rgb>,
): number {
	const lines = wrapText(text, font, size, maxWidth);
	let nextY = y;
	for (const line of lines) {
		page.drawText(line, { x, y: nextY, size, font, color });
		nextY -= size + 4;
	}
	return nextY;
}

export async function createCompanyProfilePdf(input: CompanyProfileInput): Promise<Uint8Array> {
	validateCompanyProfile(input);
	const document = await PDFDocument.create();
	const regular = await document.embedFont(StandardFonts.Helvetica);
	const bold = await document.embedFont(StandardFonts.HelveticaBold);
	const pageSize: [number, number] = [595.28, 841.89];
	const margin = 48;
	const contentWidth = pageSize[0] - margin * 2;
	const accent = rgb(0.12, 0.38, 0.29);
	const dark = rgb(0.12, 0.18, 0.15);
	const muted = rgb(0.39, 0.43, 0.4);
	const lineColor = rgb(0.84, 0.87, 0.83);
	let page = document.addPage(pageSize);
	let y = pageSize[1] - margin;
	const bottom = margin + 34;

	const startPage = () => {
		page = document.addPage(pageSize);
		y = pageSize[1] - margin;
	};
	const ensureSpace = (height: number) => {
		if (y - height < bottom) startPage();
	};
	const drawSection = (heading: string, body: string) => {
		if (!body.trim()) return;
		const headingLines = wrapText(heading.toUpperCase(), bold, 9, contentWidth);
		const bodyLines = wrapText(body.trim(), regular, 9, contentWidth);
		ensureSpace(headingLines.length * 12 + 35);
		for (const line of headingLines) {
			page.drawText(line, { x: margin, y, size: 9, font: bold, color: accent });
			y -= 12;
		}
		y -= 3;
		page.drawLine({ start: { x: margin, y }, end: { x: pageSize[0] - margin, y }, thickness: 0.6, color: lineColor });
		y -= 12;
		for (const line of bodyLines) {
			ensureSpace(13);
			page.drawText(line, { x: margin, y, size: 9, font: regular, color: dark });
			y -= 13;
		}
		y -= 7;
	};

	page.drawText('COMPANY PROFILE', { x: margin, y, size: 20, font: bold, color: accent });
	y -= 35;
	for (const line of wrapText(pdfText(input.companyName.trim()), bold, 24, contentWidth)) {
		ensureSpace(30);
		page.drawText(line, { x: margin, y, size: 24, font: bold, color: dark });
		y -= 29;
	}
	if (input.tagline.trim()) {
		y = drawWrappedText(page, input.tagline.trim(), margin, y - 2, contentWidth, regular, 12, muted) - 8;
	}
	page.drawLine({ start: { x: margin, y }, end: { x: pageSize[0] - margin, y }, thickness: 1.5, color: accent });
	y -= 18;

	const details = [
		input.industry.trim() && `Industry: ${input.industry.trim()}`,
		input.foundedYear !== null && `Established: ${input.foundedYear}`,
		input.headquarters.trim() && `Headquarters: ${input.headquarters.trim()}`,
	].filter((value): value is string => Boolean(value));
	if (details.length) {
		for (const line of wrapText(details.join('  |  '), regular, 8, contentWidth)) {
			ensureSpace(13);
			page.drawText(line, { x: margin, y, size: 8, font: regular, color: muted });
			y -= 12;
		}
		y -= 10;
	}

	drawSection('Company overview', input.overview);
	drawSection('Mission', input.mission);
	drawSection('Vision', input.vision);
	drawSection('Values', input.values);
	drawSection('Products and services', input.services);
	drawSection('Markets and clients', input.market);
	drawSection('What sets us apart', input.differentiators);

	const contact = [
		input.website.trim() && `Website: ${input.website.trim()}`,
		input.email.trim() && `Email: ${input.email.trim()}`,
		input.phone.trim() && `Phone: ${input.phone.trim()}`,
	].filter((value): value is string => Boolean(value));
	if (contact.length) drawSection('Contact', contact.join('\n'));

	return document.save();
}
