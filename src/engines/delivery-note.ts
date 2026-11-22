import { PDFDocument, StandardFonts, rgb, type PDFFont } from 'pdf-lib';

export const DELIVERY_NOTE_MAX_ITEMS = 50;
export const DELIVERY_NOTE_MAX_TEXT_LENGTH = 500;

export interface DeliveryNoteItem {
	description: string;
	quantity: number;
	unit: string;
}

export interface DeliveryNoteInput {
	senderName: string;
	senderDetails: string;
	recipientName: string;
	recipientDetails: string;
	noteNumber: string;
	dispatchDate: string;
	reference: string;
	carrier: string;
	deliveryAddress: string;
	items: DeliveryNoteItem[];
	notes: string;
}

function validateDate(value: string): void {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
	if (!match) throw new Error('Enter a valid dispatch date.');
	const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
	if (date.toISOString().slice(0, 10) !== value) throw new Error('Enter a valid dispatch date.');
}

function validateText(value: string, label: string, required = false): void {
	if (required && !value.trim()) throw new Error(`${label} is required.`);
	if (value.length > DELIVERY_NOTE_MAX_TEXT_LENGTH) {
		throw new Error(`${label} must be ${DELIVERY_NOTE_MAX_TEXT_LENGTH} characters or fewer.`);
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
		throw new Error('PDF export supports basic Latin and Western European characters. Replace unsupported characters in your delivery note and try again.');
	}
	return text;
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
	const output: string[] = [];
	for (const paragraph of pdfText(text).split('\n')) {
		let line = '';
		for (const word of paragraph.split(/\s+/).filter(Boolean)) {
			let remaining = word;
			while (remaining) {
				if (font.widthOfTextAtSize(line ? `${line} ${remaining}` : remaining, size) <= maxWidth) {
					line = line ? `${line} ${remaining}` : remaining;
					remaining = '';
				} else if (line) {
					output.push(line);
					line = '';
				} else {
					let length = 1;
					while (length < remaining.length && font.widthOfTextAtSize(remaining.slice(0, length + 1), size) <= maxWidth) length += 1;
					output.push(remaining.slice(0, length));
					remaining = remaining.slice(length);
				}
			}
		}
		output.push(line);
	}
	return output.length ? output : [''];
}

function drawWrapped(
	page: ReturnType<PDFDocument['addPage']>,
	text: string,
	x: number,
	y: number,
	maxWidth: number,
	font: PDFFont,
	size: number,
	color = rgb(0.16, 0.19, 0.17),
): number {
	for (const line of wrapText(text, font, size, maxWidth)) {
		page.drawText(line, { x, y, size, font, color });
		y -= size + 3;
	}
	return y;
}

function formatDate(value: string): string {
	return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`));
}

function validateInput(input: DeliveryNoteInput): void {
	validateText(input.senderName, 'Sender name', true);
	validateText(input.recipientName, 'Recipient name', true);
	validateText(input.noteNumber, 'Delivery note number', true);
	validateText(input.senderDetails, 'Sender details');
	validateText(input.recipientDetails, 'Recipient details');
	validateText(input.reference, 'Order reference');
	validateText(input.carrier, 'Carrier or delivery method');
	validateText(input.deliveryAddress, 'Delivery address');
	validateText(input.notes, 'Delivery notes');
	validateDate(input.dispatchDate);
	if (input.items.length < 1 || input.items.length > DELIVERY_NOTE_MAX_ITEMS) {
		throw new Error(`Add between 1 and ${DELIVERY_NOTE_MAX_ITEMS} delivery items.`);
	}
	for (const [index, item] of input.items.entries()) {
		validateText(item.description, `Item ${index + 1} description`, true);
		validateText(item.unit, `Item ${index + 1} unit`);
		if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
			throw new Error(`Item ${index + 1} quantity must be greater than zero.`);
		}
	}
}

export async function createDeliveryNotePdf(input: DeliveryNoteInput): Promise<Uint8Array> {
	validateInput(input);
	const document = await PDFDocument.create();
	const regular = await document.embedFont(StandardFonts.Helvetica);
	const bold = await document.embedFont(StandardFonts.HelveticaBold);
	const pageSize: [number, number] = [595.28, 841.89];
	const margin = 44;
	const contentWidth = pageSize[0] - margin * 2;
	const dark = rgb(0.12, 0.18, 0.15);
	const muted = rgb(0.39, 0.43, 0.4);
	const accent = rgb(0.12, 0.38, 0.29);
	const lineColor = rgb(0.84, 0.87, 0.83);
	let page = document.addPage(pageSize);
	let y = pageSize[1] - margin;

	const startPage = () => {
		page = document.addPage(pageSize);
		y = pageSize[1] - margin;
		drawTableHeader();
	};
	const drawTableHeader = () => {
		page.drawRectangle({ x: margin, y: y - 6, width: contentWidth, height: 23, color: rgb(0.94, 0.96, 0.93) });
		page.drawText('ITEM / DESCRIPTION', { x: margin + 6, y: y + 2, size: 7, font: bold, color: muted });
		page.drawText('QUANTITY', { x: margin + contentWidth * 0.75, y: y + 2, size: 7, font: bold, color: muted });
		page.drawText('UNIT', { x: margin + contentWidth * 0.89, y: y + 2, size: 7, font: bold, color: muted });
		y -= 24;
	};

	page.drawText('DELIVERY NOTE', { x: margin, y, size: 20, font: bold, color: accent });
	const noteRight = pageSize[0] - margin;
	const noteLabel = pdfText(input.noteNumber.trim());
	page.drawText(noteLabel, { x: noteRight - bold.widthOfTextAtSize(noteLabel, 11), y: y - 2, size: 11, font: bold, color: dark });
	y -= 31;
	page.drawLine({ start: { x: margin, y }, end: { x: noteRight, y }, thickness: 1.5, color: accent });
	y -= 22;

	page.drawText('SENDER', { x: margin, y, size: 8, font: bold, color: muted });
	page.drawText('RECIPIENT', { x: pageSize[0] / 2, y, size: 8, font: bold, color: muted });
	y -= 15;
	const startY = y;
	let senderY = drawWrapped(page, input.senderName.trim(), margin, y, contentWidth * 0.43, bold, 10, dark);
	for (const detail of input.senderDetails.split(/\r?\n/).filter(Boolean)) {
		senderY = drawWrapped(page, detail, margin, senderY, contentWidth * 0.43, regular, 9, muted);
	}
	let recipientY = drawWrapped(page, input.recipientName.trim(), pageSize[0] / 2, y, contentWidth * 0.43, bold, 10, dark);
	for (const detail of input.recipientDetails.split(/\r?\n/).filter(Boolean)) {
		recipientY = drawWrapped(page, detail, pageSize[0] / 2, recipientY, contentWidth * 0.43, regular, 9, muted);
	}
	y = Math.min(senderY, recipientY, startY - 38) - 6;

	page.drawText(`Dispatch date: ${formatDate(input.dispatchDate)}`, { x: margin, y, size: 9, font: regular, color: dark });
	y -= 15;
	if (input.reference.trim()) {
		y = drawWrapped(page, `Order reference: ${input.reference.trim()}`, margin, y, contentWidth, regular, 9, dark);
	}
	if (input.carrier.trim()) {
		y = drawWrapped(page, `Carrier / delivery method: ${input.carrier.trim()}`, margin, y, contentWidth, regular, 9, dark);
	}
	if (input.deliveryAddress.trim()) {
		y = drawWrapped(page, `Deliver to: ${input.deliveryAddress.trim()}`, margin, y, contentWidth, regular, 9, dark);
	}
	y -= 10;

	drawTableHeader();
	for (const item of input.items) {
		const descriptionLines = wrapText(item.description, regular, 9, contentWidth * 0.68);
		const unitLines = wrapText(item.unit.trim() || '—', regular, 9, contentWidth * 0.11);
		const rowHeight = Math.max(22, descriptionLines.length * 12 + 10, unitLines.length * 12 + 10);
		if (y - rowHeight < margin + 125) startPage();
		let descriptionY = y;
		for (const line of descriptionLines) {
			page.drawText(line, { x: margin + 6, y: descriptionY, size: 9, font: regular, color: dark });
			descriptionY -= 12;
		}
		const quantityText = String(item.quantity);
		const quantityRight = margin + contentWidth * 0.85;
		page.drawText(quantityText, {
			x: quantityRight - regular.widthOfTextAtSize(quantityText, 9),
			y,
			size: 9,
			font: regular,
			color: dark,
		});
		let unitY = y;
		for (const line of unitLines) {
			page.drawText(line, { x: margin + contentWidth * 0.89, y: unitY, size: 9, font: regular, color: dark });
			unitY -= 12;
		}
		y -= rowHeight;
		page.drawLine({ start: { x: margin, y: y + 5 }, end: { x: noteRight, y: y + 5 }, thickness: 0.6, color: lineColor });
	}

	if (y < margin + 130) startPage();
	y -= 12;
	page.drawText('RECEIVED BY', { x: margin, y, size: 8, font: bold, color: muted });
	page.drawText('SIGNATURE', { x: pageSize[0] / 2, y, size: 8, font: bold, color: muted });
	page.drawText('DATE RECEIVED', { x: pageSize[0] * 0.75, y, size: 8, font: bold, color: muted });
	y -= 28;
	for (const x of [margin, pageSize[0] / 2, pageSize[0] * 0.75]) {
		page.drawLine({ start: { x, y }, end: { x: x + contentWidth * 0.2, y }, thickness: 0.6, color: lineColor });
	}
	y -= 22;

	if (input.notes.trim()) {
		if (y < margin + 28) startPage();
		page.drawText('NOTES', { x: margin, y, size: 8, font: bold, color: muted });
		y = drawWrapped(page, input.notes, margin, y - 14, contentWidth, regular, 9, dark);
	}

	for (const [index, currentPage] of document.getPages().entries()) {
		currentPage.drawLine({
			start: { x: margin, y: margin - 12 },
			end: { x: noteRight, y: margin - 12 },
			thickness: 0.6,
			color: lineColor,
		});
		currentPage.drawText(`${noteLabel}  -  Page ${index + 1} of ${document.getPageCount()}`, {
			x: margin,
			y: margin - 27,
			size: 8,
			font: regular,
			color: muted,
		});
	}
	return document.save();
}
