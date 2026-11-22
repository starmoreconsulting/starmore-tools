import { isOneOf } from './expense-tracker';

export const EMPLOYEE_ATTENDANCE_STORAGE_KEY = 'starmore-employee-attendance-v1';
export const EMPLOYEE_ATTENDANCE_MAX_ENTRIES = 5000;
export const EMPLOYEE_ATTENDANCE_STATUSES = ['Present', 'Absent', 'Late', 'Leave'] as const;
export const EMPLOYEE_ATTENDANCE_MAX_EMPLOYEE_LENGTH = 120;
export const EMPLOYEE_ATTENDANCE_MAX_NOTE_LENGTH = 200;

export type EmployeeAttendanceStatus = (typeof EMPLOYEE_ATTENDANCE_STATUSES)[number];

export interface EmployeeAttendanceEntry {
	id: string;
	date: string;
	employee: string;
	status: EmployeeAttendanceStatus;
	note: string;
}

export type EmployeeAttendanceDraft = Omit<EmployeeAttendanceEntry, 'id'>;

function isString(value: unknown): value is string {
	return typeof value === 'string';
}

function isValidDate(value: string): boolean {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
	if (!match) return false;
	const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
	return date.toISOString().slice(0, 10) === value;
}

export function validateEmployeeAttendanceDraft(draft: EmployeeAttendanceDraft): void {
	if (!isValidDate(draft.date)) throw new Error('Enter a valid attendance date.');
	if (!draft.employee.trim()) throw new Error('Enter an employee name.');
	if (draft.employee.length > EMPLOYEE_ATTENDANCE_MAX_EMPLOYEE_LENGTH) {
		throw new Error(`Employee name must be ${EMPLOYEE_ATTENDANCE_MAX_EMPLOYEE_LENGTH} characters or fewer.`);
	}
	if (!isOneOf(draft.status, EMPLOYEE_ATTENDANCE_STATUSES)) throw new Error('Choose a valid attendance status.');
	if (draft.note.length > EMPLOYEE_ATTENDANCE_MAX_NOTE_LENGTH) {
		throw new Error(`Note must be ${EMPLOYEE_ATTENDANCE_MAX_NOTE_LENGTH} characters or fewer.`);
	}
}

export function validateEmployeeAttendanceEntries(value: unknown): EmployeeAttendanceEntry[] {
	if (!Array.isArray(value)) throw new Error('Saved attendance is not a valid list.');
	if (value.length > EMPLOYEE_ATTENDANCE_MAX_ENTRIES) {
		throw new Error(`Saved attendance exceeds the ${EMPLOYEE_ATTENDANCE_MAX_ENTRIES}-entry limit.`);
	}
	const entries = value.map((entry, index) => {
		if (!entry || typeof entry !== 'object') throw new Error(`Saved attendance record ${index + 1} is invalid.`);
		const candidate = entry as Record<string, unknown>;
		if (!isString(candidate.id) || !candidate.id.trim() || candidate.id.length > 120
			|| !isString(candidate.date)
			|| !isString(candidate.employee)
			|| !isOneOf(candidate.status, EMPLOYEE_ATTENDANCE_STATUSES)
			|| !isString(candidate.note)) {
			throw new Error(`Saved attendance record ${index + 1} is invalid.`);
		}
		const record: EmployeeAttendanceEntry = {
			id: candidate.id,
			date: candidate.date,
			employee: candidate.employee,
			status: candidate.status,
			note: candidate.note,
		};
		validateEmployeeAttendanceDraft(record);
		return record;
	});

	const identifiers = new Set<string>();
	const attendanceKeys = new Set<string>();
	for (const [index, entry] of entries.entries()) {
		if (identifiers.has(entry.id)) throw new Error(`Saved attendance record ${index + 1} has a duplicate identifier.`);
		identifiers.add(entry.id);
		const key = `${entry.date}\u0000${entry.employee.trim().toLocaleLowerCase()}`;
		if (attendanceKeys.has(key)) throw new Error(`Saved attendance contains duplicate records for ${entry.employee} on ${entry.date}.`);
		attendanceKeys.add(key);
	}
	return entries;
}

export function addEmployeeAttendance(
	entries: EmployeeAttendanceEntry[],
	draft: EmployeeAttendanceDraft,
	id = crypto.randomUUID(),
): EmployeeAttendanceEntry[] {
	validateEmployeeAttendanceDraft(draft);
	if (entries.length >= EMPLOYEE_ATTENDANCE_MAX_ENTRIES) {
		throw new Error(`Attendance is limited to ${EMPLOYEE_ATTENDANCE_MAX_ENTRIES} records. Export a CSV backup before removing old records.`);
	}
	if (!id.trim() || id.length > 120) throw new Error('Could not create an attendance record.');
	if (entries.some((entry) => entry.id === id)) throw new Error('An attendance record with this identifier already exists.');
	const duplicate = entries.some((entry) => entry.date === draft.date
		&& entry.employee.trim().toLocaleLowerCase() === draft.employee.trim().toLocaleLowerCase());
	if (duplicate) throw new Error(`An attendance record already exists for ${draft.employee.trim()} on ${draft.date}.`);
	return [{ ...draft, employee: draft.employee.trim(), note: draft.note.trim(), id }, ...entries];
}

export function removeEmployeeAttendance(entries: EmployeeAttendanceEntry[], id: string): EmployeeAttendanceEntry[] {
	return entries.filter((entry) => entry.id !== id);
}

export function filterEmployeeAttendanceByMonth(entries: EmployeeAttendanceEntry[], month: string): EmployeeAttendanceEntry[] {
	if (!month) return entries;
	if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error('Choose a valid month filter.');
	return entries.filter((entry) => entry.date.startsWith(`${month}-`));
}

export function summarizeEmployeeAttendance(entries: EmployeeAttendanceEntry[]): Record<EmployeeAttendanceStatus, number> {
	const totals: Record<EmployeeAttendanceStatus, number> = { Present: 0, Absent: 0, Late: 0, Leave: 0 };
	for (const entry of entries) totals[entry.status] += 1;
	return totals;
}

function csvCell(value: string): string {
	const safeValue = /^[\s]*[=+\-@]/.test(value) ? `'${value}` : value;
	return `"${safeValue.replace(/"/g, '""')}"`;
}

export function createEmployeeAttendanceCsv(entries: EmployeeAttendanceEntry[]): string {
	const validated = validateEmployeeAttendanceEntries(entries);
	const rows = [
		['Date', 'Employee', 'Status', 'Note'],
		...validated.map((entry) => [entry.date, entry.employee, entry.status, entry.note]),
	];
	return rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
}

export function decodeEmployeeAttendanceStorage(value: string | null): EmployeeAttendanceEntry[] {
	if (value === null) return [];
	try {
		return validateEmployeeAttendanceEntries(JSON.parse(value) as unknown);
	} catch (error) {
		throw new Error(error instanceof Error ? `Could not read saved attendance: ${error.message}` : 'Could not read saved attendance.');
	}
}

export function encodeEmployeeAttendanceStorage(entries: EmployeeAttendanceEntry[]): string {
	return JSON.stringify(validateEmployeeAttendanceEntries(entries));
}
