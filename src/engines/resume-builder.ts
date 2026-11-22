import { PDFDocument, StandardFonts, rgb, type PDFFont } from 'pdf-lib';

export const RESUME_MAX_NAME_LENGTH = 120;
export const RESUME_MAX_TEXT_LENGTH = 2000;
export const RESUME_MAX_ENTRY_LENGTH = 160;
export const RESUME_MAX_SKILLS_LENGTH = 1200;
export const RESUME_MAX_ENTRIES = 8;

export interface ResumeExperience {
	id: string;
	jobTitle: string;
	company: string;
	location: string;
	startDate: string;
	endDate: string;
	description: string;
}

export interface ResumeEducation {
	id: string;
	qualification: string;
	institution: string;
	location: string;
	startDate: string;
	endDate: string;
	details: string;
}

export interface ResumeInput {
	fullName: string;
	professionalTitle: string;
	email: string;
	phone: string;
	location: string;
	website: string;
	summary: string;
	skills: string;
	experience: ResumeExperience[];
	education: ResumeEducation[];
}

function validateText(value: string, label: string, maxLength: number, required = false): void {
	if (typeof value !== 'string') throw new Error(`${label} must be text.`);
	if (required && !value.trim()) throw new Error(`${label} is required.`);
	if (value.length > maxLength) throw new Error(`${label} must be ${maxLength} characters or fewer.`);
}

function isValidMonth(value: string): boolean {
	return value === '' || value === 'Present' || /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

function validatePeriod(startDate: string, endDate: string, label: string): void {
	if (!isValidMonth(startDate) || !startDate) throw new Error(`${label} start date must use YYYY-MM format.`);
	if (!isValidMonth(endDate)) throw new Error(`${label} end date must use YYYY-MM format or Present.`);
	if (endDate && endDate !== 'Present' && startDate > endDate) {
		throw new Error(`${label} end date cannot be earlier than its start date.`);
	}
}

export function validateResume(input: ResumeInput): void {
	validateText(input.fullName, 'Full name', RESUME_MAX_NAME_LENGTH, true);
	validateText(input.professionalTitle, 'Professional title', RESUME_MAX_NAME_LENGTH);
	validateText(input.email, 'Email', RESUME_MAX_NAME_LENGTH);
	validateText(input.phone, 'Phone', RESUME_MAX_NAME_LENGTH);
	validateText(input.location, 'Location', RESUME_MAX_NAME_LENGTH);
	validateText(input.website, 'Website', RESUME_MAX_NAME_LENGTH);
	validateText(input.summary, 'Professional summary', RESUME_MAX_TEXT_LENGTH);
	validateText(input.skills, 'Skills', RESUME_MAX_SKILLS_LENGTH);
	if (input.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) {
		throw new Error('Enter a valid email address.');
	}
	if (input.website.trim() && !/^(https?:\/\/)?[^\s.]+\.[^\s]+$/i.test(input.website.trim())) {
		throw new Error('Enter a valid website address.');
	}
	if (!Array.isArray(input.experience) || input.experience.length > RESUME_MAX_ENTRIES) {
		throw new Error(`Add up to ${RESUME_MAX_ENTRIES} work experience entries.`);
	}
	if (!Array.isArray(input.education) || input.education.length > RESUME_MAX_ENTRIES) {
		throw new Error(`Add up to ${RESUME_MAX_ENTRIES} education entries.`);
	}
	const ids = new Set<string>();
	for (const [index, item] of input.experience.entries()) {
		if (!item || typeof item !== 'object'
			|| typeof item.id !== 'string' || !item.id.trim() || item.id.length > 120
			|| typeof item.jobTitle !== 'string' || !item.jobTitle.trim()
			|| typeof item.company !== 'string' || !item.company.trim()
			|| typeof item.location !== 'string'
			|| typeof item.startDate !== 'string'
			|| typeof item.endDate !== 'string'
			|| typeof item.description !== 'string') {
			throw new Error(`Work experience ${index + 1} has incomplete details.`);
		}
		if (ids.has(item.id)) throw new Error('Resume entries must have unique identifiers.');
		ids.add(item.id);
		validateText(item.jobTitle, `Work experience ${index + 1} job title`, RESUME_MAX_ENTRY_LENGTH, true);
		validateText(item.company, `Work experience ${index + 1} company`, RESUME_MAX_ENTRY_LENGTH, true);
		validateText(item.location, `Work experience ${index + 1} location`, RESUME_MAX_ENTRY_LENGTH);
		validateText(item.description, `Work experience ${index + 1} description`, RESUME_MAX_TEXT_LENGTH);
		validatePeriod(item.startDate, item.endDate, `Work experience ${index + 1}`);
	}
	for (const [index, item] of input.education.entries()) {
		if (!item || typeof item !== 'object'
			|| typeof item.id !== 'string' || !item.id.trim() || item.id.length > 120
			|| typeof item.qualification !== 'string' || !item.qualification.trim()
			|| typeof item.institution !== 'string' || !item.institution.trim()
			|| typeof item.location !== 'string'
			|| typeof item.startDate !== 'string'
			|| typeof item.endDate !== 'string'
			|| typeof item.details !== 'string') {
			throw new Error(`Education ${index + 1} has incomplete details.`);
		}
		if (ids.has(item.id)) throw new Error('Resume entries must have unique identifiers.');
		ids.add(item.id);
		validateText(item.qualification, `Education ${index + 1} qualification`, RESUME_MAX_ENTRY_LENGTH, true);
		validateText(item.institution, `Education ${index + 1} institution`, RESUME_MAX_ENTRY_LENGTH, true);
		validateText(item.location, `Education ${index + 1} location`, RESUME_MAX_ENTRY_LENGTH);
		validateText(item.details, `Education ${index + 1} details`, RESUME_MAX_TEXT_LENGTH);
		validatePeriod(item.startDate, item.endDate, `Education ${index + 1}`);
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

export async function createResumePdf(input: ResumeInput): Promise<Uint8Array> {
	validateResume(input);
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
	const drawLines = (text: string, font: PDFFont, size: number, color: ReturnType<typeof rgb>, lineHeight = size + 4) => {
		const lines = wrapText(text, font, size, contentWidth);
		for (const line of lines) {
			ensureSpace(line ? lineHeight : 8);
			if (line) page.drawText(line, { x: margin, y, size, font, color });
			y -= line ? lineHeight : 8;
		}
	};
	const drawSectionHeading = (heading: string) => {
		ensureSpace(30);
		y -= 6;
		page.drawText(heading.toUpperCase(), { x: margin, y, size: 9, font: bold, color: accent });
		y -= 7;
		page.drawLine({ start: { x: margin, y }, end: { x: pageSize[0] - margin, y }, thickness: 0.6, color: lineColor });
		y -= 12;
	};

	drawLines(input.fullName.trim(), bold, 22, dark, 26);
	if (input.professionalTitle.trim()) drawLines(input.professionalTitle.trim(), regular, 12, accent, 16);
	const contact = [input.email.trim(), input.phone.trim(), input.location.trim(), input.website.trim()].filter(Boolean);
	if (contact.length) {
		y -= 4;
		drawLines(contact.join('  |  '), regular, 8, muted, 12);
	}
	page.drawLine({ start: { x: margin, y: y - 3 }, end: { x: pageSize[0] - margin, y: y - 3 }, thickness: 1.5, color: accent });
	y -= 18;

	if (input.summary.trim()) {
		drawSectionHeading('Professional Summary');
		drawLines(input.summary.trim(), regular, 9, dark, 13);
	}
	if (input.experience.length) {
		drawSectionHeading('Work Experience');
		for (const item of input.experience) {
			const period = `${item.startDate} - ${item.endDate || 'Present'}`;
			ensureSpace(28);
			drawLines(`${item.jobTitle.trim()} | ${item.company.trim()}`, bold, 10, dark, 13);
			const details = [item.location.trim(), period].filter(Boolean).join('  |  ');
			drawLines(details, regular, 8, muted, 11);
			if (item.description.trim()) drawLines(item.description.trim(), regular, 9, dark, 13);
			y -= 5;
		}
	}
	if (input.education.length) {
		drawSectionHeading('Education');
		for (const item of input.education) {
			ensureSpace(26);
			drawLines(`${item.qualification.trim()} | ${item.institution.trim()}`, bold, 10, dark, 13);
			const details = [item.location.trim(), item.startDate ? `${item.startDate} - ${item.endDate || 'Present'}` : ''].filter(Boolean).join('  |  ');
			if (details) drawLines(details, regular, 8, muted, 11);
			if (item.details.trim()) drawLines(item.details.trim(), regular, 9, dark, 13);
			y -= 5;
		}
	}
	if (input.skills.trim()) {
		drawSectionHeading('Skills');
		drawLines(input.skills.split(/[\n,]/).map((skill) => skill.trim()).filter(Boolean).join('  |  '), regular, 9, dark, 13);
	}
	return document.save();
}
