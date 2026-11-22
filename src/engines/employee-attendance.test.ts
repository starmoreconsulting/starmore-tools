import { describe, expect, it } from 'vitest';
import {
	addEmployeeAttendance,
	createEmployeeAttendanceCsv,
	decodeEmployeeAttendanceStorage,
	encodeEmployeeAttendanceStorage,
	filterEmployeeAttendanceByMonth,
	removeEmployeeAttendance,
	summarizeEmployeeAttendance,
	validateEmployeeAttendanceDraft,
	type EmployeeAttendanceDraft,
	type EmployeeAttendanceEntry,
} from './employee-attendance';

const draft: EmployeeAttendanceDraft = {
	date: '2026-11-22',
	employee: 'Jordan Lee',
	status: 'Present',
	note: '',
};

const entries: EmployeeAttendanceEntry[] = [
	{ ...draft, id: 'one' },
	{ ...draft, id: 'two', employee: 'Alex Kim', status: 'Late' },
	{ ...draft, id: 'three', employee: 'Sam Patel', status: 'Leave', date: '2026-10-12' },
];

describe('employee attendance tracker', () => {
	it('adds trimmed records and removes them without mutating existing entries', () => {
		const next = addEmployeeAttendance(entries, { ...draft, employee: '  Taylor Morgan  ', note: '  On time  ' }, 'new');
		expect(next).toHaveLength(4);
		expect(next[0]).toMatchObject({ id: 'new', employee: 'Taylor Morgan', note: 'On time' });
		expect(entries).toHaveLength(3);
		expect(removeEmployeeAttendance(next, 'new')).toEqual(entries);
	});

	it('validates dates, employee names, statuses, and note length', () => {
		expect(() => validateEmployeeAttendanceDraft({ ...draft, date: '2026-02-30' })).toThrow('valid attendance date');
		expect(() => validateEmployeeAttendanceDraft({ ...draft, employee: ' ' })).toThrow('employee name');
		expect(() => validateEmployeeAttendanceDraft({ ...draft, status: 'Unknown' as EmployeeAttendanceDraft['status'] })).toThrow('valid attendance status');
		expect(() => validateEmployeeAttendanceDraft({ ...draft, note: 'x'.repeat(201) })).toThrow('200 characters or fewer');
	});

	it('prevents duplicate employee records on the same day regardless of case', () => {
		expect(() => addEmployeeAttendance(entries, { ...draft, employee: ' jordan lee ' }, 'duplicate')).toThrow('already exists');
		const changedDate = addEmployeeAttendance(entries, { ...draft, employee: 'jordan lee', date: '2026-11-23' }, 'next-day');
		expect(changedDate).toHaveLength(4);
	});

	it('filters by month and summarizes status counts', () => {
		expect(filterEmployeeAttendanceByMonth(entries, '2026-11')).toHaveLength(2);
		expect(summarizeEmployeeAttendance(entries)).toEqual({ Present: 1, Absent: 0, Late: 1, Leave: 1 });
		expect(() => filterEmployeeAttendanceByMonth(entries, '2026-13')).toThrow('valid month filter');
	});

	it('exports escaped CSV and guards spreadsheet formulas', () => {
		const csv = createEmployeeAttendanceCsv([{ ...draft, id: 'csv', employee: '=cmd()', note: 'Client, "A"' }]);
		expect(csv).toContain('"\'=cmd()"');
		expect(csv).toContain('"Client, ""A"""');
		expect(csv.split('\r\n')[0]).toBe('"Date","Employee","Status","Note"');
	});

	it('loads and validates saved records', () => {
		expect(decodeEmployeeAttendanceStorage(JSON.stringify(entries))).toEqual(entries);
		expect(decodeEmployeeAttendanceStorage(null)).toEqual([]);
		expect(JSON.parse(encodeEmployeeAttendanceStorage(entries))).toEqual(entries);
		expect(() => decodeEmployeeAttendanceStorage('{invalid')).toThrow('Could not read saved attendance');
		expect(() => decodeEmployeeAttendanceStorage(JSON.stringify([{ ...draft, id: 'bad', status: 'Unknown' }]))).toThrow('Saved attendance record 1 is invalid');
		expect(() => decodeEmployeeAttendanceStorage(JSON.stringify([entries[0], { ...entries[0], id: 'dup' }]))).toThrow('duplicate records');
	});
});
