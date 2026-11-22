import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export const TIMESHEET_MAX_NAME_LENGTH = 120;
export const TIMESHEET_MAX_PROJECT_LENGTH = 160;
export const TIMESHEET_MAX_NOTE_LENGTH = 200;
export const TIMESHEET_DAYS_PER_WEEK = 7;

export interface TimesheetDay {
	startTime: string;
	endTime: string;
	breakMinutes: number;
	note: string;
}

export interface TimesheetInput {
	employee: string;
	company: string;
	project: string;
	weekStart: string;
	days: TimesheetDay[];
}

export interface TimesheetDayTotal extends TimesheetDay {
	date: string;
	workedMinutes: number;
}

export interface TimesheetSummary {
	days: TimesheetDayTotal[];
	totalWorkedMinutes: number;
	totalHours: number;
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

function dateOffset(date: string, offset: number): string {
	const value = new Date(`${date}T00:00:00Z`);
	value.setUTCDate(value.getUTCDate() + offset);
	return value.toISOString().slice(0, 10);
}

function timeMinutes(value: string): number {
	const [hours, minutes] = value.split(':').map(Number);
	return hours * 60 + minutes;
}

export function calculateTimesheet(input: TimesheetInput): TimesheetSummary {
	if (typeof input.employee !== 'string' || !input.employee.trim()) throw new Error('Enter the employee name.');
	if (input.employee.length > TIMESHEET_MAX_NAME_LENGTH) throw new Error(`Employee name must be ${TIMESHEET_MAX_NAME_LENGTH} characters or fewer.`);
	if (typeof input.company !== 'string' || input.company.length > TIMESHEET_MAX_NAME_LENGTH) throw new Error(`Company name must be ${TIMESHEET_MAX_NAME_LENGTH} characters or fewer.`);
	if (typeof input.project !== 'string' || input.project.length > TIMESHEET_MAX_PROJECT_LENGTH) throw new Error(`Project name must be ${TIMESHEET_MAX_PROJECT_LENGTH} characters or fewer.`);
	if (!isValidDate(input.weekStart)) throw new Error('Enter a valid week start date.');
	if (!Array.isArray(input.days) || input.days.length !== TIMESHEET_DAYS_PER_WEEK) {
		throw new Error(`A timesheet must include exactly ${TIMESHEET_DAYS_PER_WEEK} daily entries.`);
	}

	const days = input.days.map((day, index): TimesheetDayTotal => {
		if (!day || typeof day !== 'object'
			|| typeof day.startTime !== 'string' || !isValidTime(day.startTime)
			|| typeof day.endTime !== 'string' || !isValidTime(day.endTime)
			|| typeof day.note !== 'string' || day.note.length > TIMESHEET_MAX_NOTE_LENGTH) {
			throw new Error(`Day ${index + 1} has invalid time or note details.`);
		}
		if (!Number.isSafeInteger(day.breakMinutes) || day.breakMinutes < 0 || day.breakMinutes > 1440) {
			throw new Error(`Day ${index + 1} break must be a whole number of minutes between 0 and 1440.`);
		}
		if ((day.startTime === '') !== (day.endTime === '')) {
			throw new Error(`Enter both start and end times for day ${index + 1}, or leave both blank.`);
		}
		const elapsed = day.startTime === '' ? 0 : timeMinutes(day.endTime) - timeMinutes(day.startTime);
		if (elapsed < 0) throw new Error(`End time for day ${index + 1} must be after its start time. Overnight shifts are not supported.`);
		if (day.breakMinutes > elapsed) throw new Error(`Break on day ${index + 1} cannot exceed the time worked.`);
		return {
			...day,
			date: dateOffset(input.weekStart, index),
			workedMinutes: elapsed - day.breakMinutes,
		};
	});
	const totalWorkedMinutes = days.reduce((total, day) => total + day.workedMinutes, 0);
	if (!Number.isSafeInteger(totalWorkedMinutes)) throw new Error('Timesheet total is too large to calculate safely.');
	return { days, totalWorkedMinutes, totalHours: totalWorkedMinutes / 60 };
}

function formatHours(minutes: number): string {
	const hours = Math.floor(minutes / 60);
	const remainingMinutes = minutes % 60;
	return `${hours}:${String(remainingMinutes).padStart(2, '0')}`;
}

export async function createTimesheetPdf(input: TimesheetInput): Promise<Uint8Array> {
	const summary = calculateTimesheet(input);
	const document = await PDFDocument.create();
	const page = document.addPage([595.28, 841.89]);
	const regular = await document.embedFont(StandardFonts.Helvetica);
	const bold = await document.embedFont(StandardFonts.HelveticaBold);
	const margin = 44;
	const width = page.getWidth() - margin * 2;
	const ink = rgb(0.16, 0.21, 0.18);
	const muted = rgb(0.4, 0.45, 0.41);
	const accent = rgb(0.16, 0.38, 0.28);
	const line = rgb(0.84, 0.87, 0.83);
	let y = page.getHeight() - 54;

	page.drawText('WEEKLY TIMESHEET', { x: margin, y, size: 19, font: bold, color: accent });
	y -= 32;
	page.drawText(`Employee: ${input.employee.trim()}`, { x: margin, y, size: 10, font: bold, color: ink });
	y -= 17;
	if (input.company.trim()) {
		page.drawText(`Company: ${input.company.trim()}`, { x: margin, y, size: 9, font: regular, color: muted });
		y -= 15;
	}
	page.drawText(`Week starting: ${summary.days[0].date}`, { x: margin, y, size: 9, font: regular, color: muted });
	y -= 15;
	if (input.project.trim()) {
		page.drawText(`Project: ${input.project.trim()}`, { x: margin, y, size: 9, font: regular, color: muted });
		y -= 15;
	}
	y -= 14;

	const columns = [
		{ label: 'DATE', x: margin, width: 75 },
		{ label: 'START', x: margin + 80, width: 45 },
		{ label: 'END', x: margin + 132, width: 45 },
		{ label: 'BREAK', x: margin + 184, width: 48 },
		{ label: 'HOURS', x: margin + 242, width: 52 },
		{ label: 'NOTES', x: margin + 302, width: width - 302 },
	];
	page.drawRectangle({ x: margin, y: y - 5, width, height: 23, color: rgb(0.95, 0.96, 0.93) });
	for (const column of columns) {
		page.drawText(column.label, { x: column.x, y: y + 2, size: 7, font: bold, color: muted, maxWidth: column.width });
	}
	y -= 25;

	for (const day of summary.days) {
		page.drawLine({ start: { x: margin, y: y - 7 }, end: { x: margin + width, y: y - 7 }, thickness: 0.5, color: line });
		const values = [
			day.date,
			day.startTime || '—',
			day.endTime || '—',
			String(day.breakMinutes),
			formatHours(day.workedMinutes),
			day.note.replace(/[\r\n\t]/g, ' ').slice(0, 70) || '—',
		];
		for (const [index, column] of columns.entries()) {
			page.drawText(values[index], { x: column.x, y, size: 8, font: regular, color: ink, maxWidth: column.width });
		}
		y -= 31;
	}
	y -= 12;
	page.drawLine({ start: { x: margin, y: y + 8 }, end: { x: margin + width, y: y + 8 }, thickness: 1, color: accent });
	page.drawText(`TOTAL HOURS: ${formatHours(summary.totalWorkedMinutes)} (${summary.totalHours.toFixed(2)} decimal hours)`, {
		x: margin, y: y - 8, size: 11, font: bold, color: accent,
	});
	y -= 42;
	page.drawText('Employee signature: __________________________________', { x: margin, y, size: 9, font: regular, color: muted });
	page.drawText('Date: __________________', { x: margin + width - 170, y, size: 9, font: regular, color: muted });
	y -= 34;
	page.drawText('Approved by: ________________________________________', { x: margin, y, size: 9, font: regular, color: muted });
	page.drawText('Date: __________________', { x: margin + width - 170, y, size: 9, font: regular, color: muted });

	return document.save();
}
