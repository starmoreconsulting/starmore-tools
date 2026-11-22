import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { calculateTimesheet, createTimesheetPdf, type TimesheetInput } from './timesheet';

const timesheet: TimesheetInput = {
	employee: 'Jordan Lee',
	company: 'Starmore Studio',
	project: 'Website refresh',
	weekStart: '2026-11-16',
	days: [
		{ startTime: '09:00', endTime: '17:30', breakMinutes: 30, note: 'Design work' },
		{ startTime: '09:00', endTime: '17:00', breakMinutes: 60, note: '' },
		{ startTime: '09:15', endTime: '17:15', breakMinutes: 45, note: '' },
		{ startTime: '09:00', endTime: '17:00', breakMinutes: 60, note: '' },
		{ startTime: '09:00', endTime: '13:00', breakMinutes: 0, note: '' },
		{ startTime: '', endTime: '', breakMinutes: 0, note: '' },
		{ startTime: '', endTime: '', breakMinutes: 0, note: '' },
	],
};

describe('timesheet generator', () => {
	it('calculates daily net time and weekly total with sequential dates', () => {
		const result = calculateTimesheet(timesheet);
		expect(result.days.map((day) => day.date)).toEqual([
			'2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21', '2026-11-22',
		]);
		expect(result.days.map((day) => day.workedMinutes)).toEqual([480, 420, 435, 420, 240, 0, 0]);
		expect(result.totalWorkedMinutes).toBe(1995);
		expect(result.totalHours).toBe(33.25);
	});

	it('allows blank days and zero-duration shifts', () => {
		const result = calculateTimesheet({ ...timesheet, days: timesheet.days.map(() => ({ startTime: '', endTime: '', breakMinutes: 0, note: '' })) });
		expect(result.totalWorkedMinutes).toBe(0);
	});

	it('rejects invalid employee details, dates, and incomplete week data', () => {
		expect(() => calculateTimesheet({ ...timesheet, employee: ' ' })).toThrow('employee name');
		expect(() => calculateTimesheet({ ...timesheet, weekStart: '2026-02-30' })).toThrow('valid week start date');
		expect(() => calculateTimesheet({ ...timesheet, days: timesheet.days.slice(0, 6) })).toThrow('exactly 7');
	});

	it('rejects partial, reversed, or invalid time ranges and excessive breaks', () => {
		expect(() => calculateTimesheet({ ...timesheet, days: [{ ...timesheet.days[0], endTime: '' }, ...timesheet.days.slice(1)] })).toThrow('both start and end');
		expect(() => calculateTimesheet({ ...timesheet, days: [{ ...timesheet.days[0], startTime: '18:00' }, ...timesheet.days.slice(1)] })).toThrow('End time');
		expect(() => calculateTimesheet({ ...timesheet, days: [{ ...timesheet.days[0], breakMinutes: 600 }, ...timesheet.days.slice(1)] })).toThrow('cannot exceed');
		expect(() => calculateTimesheet({ ...timesheet, days: [{ ...timesheet.days[0], startTime: '25:00' }, ...timesheet.days.slice(1)] })).toThrow('invalid time');
	});

	it('creates a readable PDF with validated timesheet data', async () => {
		const bytes = await createTimesheetPdf(timesheet);
		const pdf = await PDFDocument.load(bytes);
		expect(pdf.getPageCount()).toBe(1);
		expect(bytes.length).toBeGreaterThan(500);
	});
});
