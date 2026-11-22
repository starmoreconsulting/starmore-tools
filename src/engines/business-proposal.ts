import { PDFDocument, StandardFonts, rgb, type PDFFont } from 'pdf-lib';
import { EXPENSE_TRACKER_CURRENCIES, isOneOf, type ExpenseTrackerCurrency } from './expense-tracker';

export const BUSINESS_PROPOSAL_MAX_TEXT_LENGTH = 2000;
export const BUSINESS_PROPOSAL_MAX_NAME_LENGTH = 120;
export const BUSINESS_PROPOSAL_MAX_NUMBER_LENGTH = 80;
export const BUSINESS_PROPOSAL_CURRENCIES = EXPENSE_TRACKER_CURRENCIES;

export interface BusinessProposalInput {
	providerName: string;
	providerDetails: string;
	clientName: string;
	clientDetails: string;
	proposalNumber: string;
	proposalDate: string;
	validUntil: string;
	projectTitle: string;
	executiveSummary: string;
	clientNeeds: string;
	proposedSolution: string;
	scope: string;
	deliverables: string;
	timeline: string;
	currency: ExpenseTrackerCurrency;
	investment: number | null;
	terms: string;
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

export function validateBusinessProposal(input: BusinessProposalInput): void {
	validateText(input.providerName, 'Provider name', BUSINESS_PROPOSAL_MAX_NAME_LENGTH, true);
	validateText(input.providerDetails, 'Provider details', BUSINESS_PROPOSAL_MAX_TEXT_LENGTH);
	validateText(input.clientName, 'Client name', BUSINESS_PROPOSAL_MAX_NAME_LENGTH, true);
	validateText(input.clientDetails, 'Client details', BUSINESS_PROPOSAL_MAX_TEXT_LENGTH);
	validateText(input.proposalNumber, 'Proposal number', BUSINESS_PROPOSAL_MAX_NUMBER_LENGTH, true);
	validateText(input.projectTitle, 'Project title', BUSINESS_PROPOSAL_MAX_NAME_LENGTH, true);
	validateText(input.executiveSummary, 'Executive summary', BUSINESS_PROPOSAL_MAX_TEXT_LENGTH, true);
	validateText(input.clientNeeds, 'Client needs', BUSINESS_PROPOSAL_MAX_TEXT_LENGTH, true);
	validateText(input.proposedSolution, 'Proposed solution', BUSINESS_PROPOSAL_MAX_TEXT_LENGTH, true);
	validateText(input.scope, 'Scope of work', BUSINESS_PROPOSAL_MAX_TEXT_LENGTH, true);
	validateText(input.deliverables, 'Deliverables', BUSINESS_PROPOSAL_MAX_TEXT_LENGTH, true);
	validateText(input.timeline, 'Timeline', BUSINESS_PROPOSAL_MAX_TEXT_LENGTH, true);
	validateText(input.terms, 'Terms and assumptions', BUSINESS_PROPOSAL_MAX_TEXT_LENGTH);
	if (!isValidDate(input.proposalDate) || !isValidDate(input.validUntil)) throw new Error('Enter valid proposal and expiry dates.');
	if (input.validUntil < input.proposalDate) throw new Error('The validity date cannot be earlier than the proposal date.');
	if (!isOneOf(input.currency, BUSINESS_PROPOSAL_CURRENCIES)) throw new Error('Choose a supported currency.');
	if (input.investment !== null
		&& (!Number.isFinite(input.investment) || input.investment < 0
			|| !Number.isSafeInteger(Math.round(input.investment * 100)))) {
		throw new Error('Investment estimate must be a non-negative amount within the supported limit.');
	}
}

export function formatBusinessProposalAmount(amount: number, currency: string): string {
	if (!Number.isFinite(amount)) throw new Error('Enter a valid investment amount.');
	return `${currency} ${new Intl.NumberFormat('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)}`;
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

function formatDate(value: string): string {
	return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`));
}

export async function createBusinessProposalPdf(input: BusinessProposalInput): Promise<Uint8Array> {
	validateBusinessProposal(input);
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
	const drawHeading = (title: string) => {
		ensureSpace(32);
		page.drawText(pdfText(title.toUpperCase()), { x: margin, y, size: 10, font: bold, color: accent });
		y -= 15;
		page.drawLine({ start: { x: margin, y }, end: { x: pageSize[0] - margin, y }, thickness: 0.6, color: lineColor });
		y -= 12;
	};
	const drawParagraph = (text: string, font = regular, size = 9, color = dark) => {
		const lines = wrapText(text, font, size, contentWidth);
		for (const line of lines) {
			ensureSpace(14);
			page.drawText(line, { x: margin, y, size, font, color });
			y -= 13;
		}
		y -= 6;
	};

	page.drawText('BUSINESS PROPOSAL', { x: margin, y, size: 19, font: bold, color: accent });
	y -= 29;
	drawParagraph(input.projectTitle.trim(), bold, 14, dark);
	page.drawText(`Proposal ${pdfText(input.proposalNumber.trim())}`, { x: margin, y, size: 9, font: bold, color: muted });
	y -= 15;
	page.drawText(`Prepared ${formatDate(input.proposalDate)}  |  Valid through ${formatDate(input.validUntil)}`, {
		x: margin, y, size: 8, font: regular, color: muted,
	});
	y -= 20;
	page.drawLine({ start: { x: margin, y }, end: { x: pageSize[0] - margin, y }, thickness: 1.5, color: accent });
	y -= 20;

	const partyColumnGap = 24;
	const partyColumnWidth = (contentWidth - partyColumnGap) / 2;
	for (const [label, name, details, x] of [
		['PREPARED BY', input.providerName, input.providerDetails, margin],
		['PREPARED FOR', input.clientName, input.clientDetails, margin + partyColumnWidth + partyColumnGap],
	] as const) {
		page.drawText(label, { x, y, size: 7, font: bold, color: muted });
		page.drawText(pdfText(name.trim()), { x, y: y - 14, size: 10, font: bold, color: dark });
		let detailY = y - 28;
		for (const line of wrapText(details.trim() || '-', regular, 8, partyColumnWidth)) {
			page.drawText(line, { x, y: detailY, size: 8, font: regular, color: muted });
			detailY -= 11;
		}
	}
	y -= 60;

	const sections: [string, string][] = [
		['Executive summary', input.executiveSummary],
		['Client needs', input.clientNeeds],
		['Proposed solution', input.proposedSolution],
		['Scope of work', input.scope],
		['Deliverables', input.deliverables],
		['Timeline', input.timeline],
	];
	for (const [heading, content] of sections) {
		drawHeading(heading);
		drawParagraph(content.trim());
	}
	if (input.investment !== null) {
		drawHeading('Investment estimate');
		drawParagraph(formatBusinessProposalAmount(input.investment, input.currency), bold, 11, accent);
		drawParagraph('This estimate is for proposal planning and is subject to the terms and assumptions below.', regular, 8, muted);
	}
	if (input.terms.trim()) {
		drawHeading('Terms and assumptions');
		drawParagraph(input.terms.trim());
	}
	ensureSpace(28);
	drawParagraph('This proposal describes a proposed engagement. Work begins only after both parties agree to the final scope and terms.', regular, 7, muted);

	return document.save();
}
