import { PDFDocument, StandardFonts, rgb, type PDFFont } from 'pdf-lib';

export const MEETING_MINUTES_MAX_TITLE_LENGTH = 160;
export const MEETING_MINUTES_MAX_TEXT_LENGTH = 2000;
export const MEETING_MINUTES_MAX_ITEMS = 50;

export interface MeetingMinutesAction {
	id: string;
	task: string;
	owner: string;
	dueDate: string;
}

export interface MeetingMinutesInput {
	meetingTitle: string;
	meetingDate: string;
	startTime: string;
	endTime: string;
	location: string;
	facilitator: string;
	recorder: string;
	attendees: string;
	agenda: string;
	discussion: string;
	decisions: string;
	actions: MeetingMinutesAction[];
	nextMeeting: string;
}

function isValidDate(value: string): boolean {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
	if (!match) return false;
	const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
	return date.toISOString().slice(0, 10) === value;
}

function isValidTime(value: string): boolean {
	return value === '' || /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function validateText(value: string, label: string, maxLength: number, required = false): void {
	if (typeof value !== 'string') throw new Error(`${label} must be text.`);
	if (required && !value.trim()) throw new Error(`${label} is required.`);
	if (value.length > maxLength) throw new Error(`${label} must be ${maxLength} characters or fewer.`);
}

export function validateMeetingMinutes(input: MeetingMinutesInput): void {
	validateText(input.meetingTitle, 'Meeting title', MEETING_MINUTES_MAX_TITLE_LENGTH, true);
	validateText(input.location, 'Location', MEETING_MINUTES_MAX_TITLE_LENGTH);
	validateText(input.facilitator, 'Facilitator', MEETING_MINUTES_MAX_TITLE_LENGTH);
	validateText(input.recorder, 'Recorder', MEETING_MINUTES_MAX_TITLE_LENGTH);
	validateText(input.attendees, 'Attendees', MEETING_MINUTES_MAX_TEXT_LENGTH);
	validateText(input.agenda, 'Agenda', MEETING_MINUTES_MAX_TEXT_LENGTH);
	validateText(input.discussion, 'Discussion notes', MEETING_MINUTES_MAX_TEXT_LENGTH, true);
	validateText(input.decisions, 'Decisions', MEETING_MINUTES_MAX_TEXT_LENGTH);
	validateText(input.nextMeeting, 'Next meeting details', MEETING_MINUTES_MAX_TEXT_LENGTH);
	if (!isValidDate(input.meetingDate)) throw new Error('Enter a valid meeting date.');
	if (!isValidTime(input.startTime) || !isValidTime(input.endTime)) throw new Error('Enter valid meeting times.');
	if (input.startTime && input.endTime && input.endTime < input.startTime) throw new Error('The end time cannot be earlier than the start time.');
	if (!Array.isArray(input.actions) || input.actions.length > MEETING_MINUTES_MAX_ITEMS) {
		throw new Error(`A meeting can include up to ${MEETING_MINUTES_MAX_ITEMS} action items.`);
	}
	const ids = new Set<string>();
	for (const [index, action] of input.actions.entries()) {
		if (!action || typeof action !== 'object'
			|| typeof action.id !== 'string' || !action.id.trim() || action.id.length > 120
			|| typeof action.task !== 'string' || !action.task.trim() || action.task.length > MEETING_MINUTES_MAX_TEXT_LENGTH
			|| typeof action.owner !== 'string' || action.owner.length > MEETING_MINUTES_MAX_TITLE_LENGTH
			|| typeof action.dueDate !== 'string' || (action.dueDate !== '' && !isValidDate(action.dueDate))) {
			throw new Error(`Action item ${index + 1} has invalid details.`);
		}
		if (ids.has(action.id)) throw new Error('Action items must have unique identifiers.');
		ids.add(action.id);
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

function formatDate(value: string): string {
	return new Intl.DateTimeFormat('en', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`));
}

function formatTimeRange(input: MeetingMinutesInput): string {
	if (input.startTime && input.endTime) return `${input.startTime} - ${input.endTime}`;
	return input.startTime || input.endTime || '';
}

export async function createMeetingMinutesPdf(input: MeetingMinutesInput): Promise<Uint8Array> {
	validateMeetingMinutes(input);
	const document = await PDFDocument.create();
	const regular = await document.embedFont(StandardFonts.Helvetica);
	const bold = await document.embedFont(StandardFonts.HelveticaBold);
	const pageSize: [number, number] = [595.28, 841.89];
	const margin = 48;
	const contentWidth = pageSize[0] - margin * 2;
	const dark = rgb(0.13, 0.17, 0.15);
	const muted = rgb(0.39, 0.43, 0.4);
	const accent = rgb(0.12, 0.38, 0.29);
	const lineColor = rgb(0.84, 0.87, 0.83);
	let page = document.addPage(pageSize);
	let y = pageSize[1] - margin;
	const bottom = margin + 30;

	const startPage = () => {
		page = document.addPage(pageSize);
		y = pageSize[1] - margin;
	};
	const ensureSpace = (height: number) => {
		if (y - height < bottom) startPage();
	};
	const drawHeading = (heading: string) => {
		ensureSpace(30);
		page.drawText(pdfText(heading.toUpperCase()), { x: margin, y, size: 9, font: bold, color: accent });
		y -= 14;
		page.drawLine({ start: { x: margin, y }, end: { x: pageSize[0] - margin, y }, thickness: 0.6, color: lineColor });
		y -= 11;
	};
	const drawText = (text: string, font = regular, size = 9, color = dark) => {
		for (const line of wrapText(text, font, size, contentWidth)) {
			ensureSpace(line ? 14 : 9);
			if (line) page.drawText(line, { x: margin, y, size, font, color });
			y -= line ? 13 : 8;
		}
		y -= 5;
	};
	const drawSection = (heading: string, content: string) => {
		if (!content.trim()) return;
		drawHeading(heading);
		drawText(content.trim());
	};

	page.drawText('MEETING MINUTES', { x: margin, y, size: 19, font: bold, color: accent });
	y -= 28;
	for (const line of wrapText(pdfText(input.meetingTitle.trim()), bold, 13, contentWidth)) {
		page.drawText(line, { x: margin, y, size: 13, font: bold, color: dark });
		y -= 17;
	}
	y -= 4;

	const detailColumns: [string, string][] = [
		['Date', formatDate(input.meetingDate)],
		['Time', formatTimeRange(input) || 'Not specified'],
		['Location', input.location.trim() || 'Not specified'],
		['Facilitator', input.facilitator.trim() || 'Not specified'],
		['Recorder', input.recorder.trim() || 'Not specified'],
	];
	const detailGap = 20;
	const detailWidth = (contentWidth - detailGap) / 2;
	let detailY = y;
	for (let index = 0; index < detailColumns.length; index += 2) {
		ensureSpace(30);
		const rowY = detailY;
		for (const [column, [label, value]] of detailColumns.slice(index, index + 2).entries()) {
			const x = margin + column * (detailWidth + detailGap);
			page.drawText(label.toUpperCase(), { x, y: rowY, size: 6.5, font: bold, color: muted });
			const lines = wrapText(value, regular, 8, detailWidth);
			for (const [lineIndex, line] of lines.entries()) {
				page.drawText(line, { x, y: rowY - 12 - lineIndex * 10, size: 8, font: regular, color: dark });
			}
		}
		detailY -= 32;
	}
	y = detailY - 7;

	drawSection('Attendees', input.attendees);
	drawSection('Agenda', input.agenda);
	drawSection('Discussion notes', input.discussion);
	drawSection('Decisions', input.decisions);

	if (input.actions.length) {
		drawHeading('Action items');
		const rowLayout = { taskX: margin, ownerX: margin + contentWidth * 0.58, dueX: margin + contentWidth * 0.8 };
		const drawTableHeader = () => {
			ensureSpace(22);
			page.drawText('ACTION', { x: rowLayout.taskX, y, size: 7, font: bold, color: muted });
			page.drawText('OWNER', { x: rowLayout.ownerX, y, size: 7, font: bold, color: muted });
			page.drawText('DUE', { x: rowLayout.dueX, y, size: 7, font: bold, color: muted });
			y -= 13;
		};
		drawTableHeader();
		for (const action of input.actions) {
			const taskLines = wrapText(action.task.trim(), regular, 8, rowLayout.ownerX - rowLayout.taskX - 10);
			const ownerLines = wrapText(action.owner.trim() || '—', regular, 8, rowLayout.dueX - rowLayout.ownerX - 8);
			const dueText = action.dueDate ? new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${action.dueDate}T00:00:00Z`)) : '—';
			const dueLines = wrapText(dueText, regular, 8, pageSize[0] - margin - rowLayout.dueX);
			const rowHeight = Math.max(taskLines.length, ownerLines.length, dueLines.length) * 11 + 8;
			if (y - rowHeight < bottom) {
				startPage();
				drawTableHeader();
			}
			const rowY = y;
			for (const [index, line] of taskLines.entries()) page.drawText(line, { x: rowLayout.taskX, y: rowY - index * 11, size: 8, font: regular, color: dark });
			for (const [index, line] of ownerLines.entries()) page.drawText(line, { x: rowLayout.ownerX, y: rowY - index * 11, size: 8, font: regular, color: dark });
			for (const [index, line] of dueLines.entries()) page.drawText(line, { x: rowLayout.dueX, y: rowY - index * 11, size: 8, font: regular, color: dark });
			y -= rowHeight;
		}
		y -= 4;
	}

	drawSection('Next meeting', input.nextMeeting);
	return document.save();
}
