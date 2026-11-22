import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
	addEmployeeAttendance,
	createEmployeeAttendanceCsv,
	decodeEmployeeAttendanceStorage,
	encodeEmployeeAttendanceStorage,
	EMPLOYEE_ATTENDANCE_MAX_EMPLOYEE_LENGTH,
	EMPLOYEE_ATTENDANCE_MAX_NOTE_LENGTH,
	EMPLOYEE_ATTENDANCE_STATUSES,
	EMPLOYEE_ATTENDANCE_STORAGE_KEY,
	filterEmployeeAttendanceByMonth,
	removeEmployeeAttendance,
	summarizeEmployeeAttendance,
	type EmployeeAttendanceDraft,
	type EmployeeAttendanceEntry,
	type EmployeeAttendanceStatus,
} from '../../engines/employee-attendance';
import { isOneOf } from '../../engines/expense-tracker';
import { triggerDownload } from '../../engines/pdf';

function localDateString(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

function currentMonthString(date: Date): string {
	return localDateString(date).slice(0, 7);
}

function initialDraft(): EmployeeAttendanceDraft {
	return { date: localDateString(new Date()), employee: '', status: 'Present', note: '' };
}

export default function EmployeeAttendanceTracker() {
	const [entries, setEntries] = useState<EmployeeAttendanceEntry[]>([]);
	const [draft, setDraft] = useState<EmployeeAttendanceDraft>(initialDraft);
	const [month, setMonth] = useState(() => currentMonthString(new Date()));
	const [message, setMessage] = useState('Loading attendance saved in this browser.');
	const [isError, setIsError] = useState(false);
	const [storageReady, setStorageReady] = useState(false);

	useEffect(() => {
		try {
			setEntries(decodeEmployeeAttendanceStorage(localStorage.getItem(EMPLOYEE_ATTENDANCE_STORAGE_KEY)));
			setMessage('Attendance records are stored only in this browser on this device.');
			setStorageReady(true);
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Could not restore saved attendance.');
			setIsError(true);
		}
	}, []);

	useEffect(() => {
		if (!storageReady) return;
		try {
			localStorage.setItem(EMPLOYEE_ATTENDANCE_STORAGE_KEY, encodeEmployeeAttendanceStorage(entries));
		} catch {
			setMessage('Could not save attendance in this browser. Export a CSV backup before leaving this page.');
			setIsError(true);
		}
	}, [entries, storageReady]);

	const visibleEntries = useMemo(() => filterEmployeeAttendanceByMonth(entries, month), [entries, month]);
	const totals = useMemo(() => summarizeEmployeeAttendance(visibleEntries), [visibleEntries]);

	const updateDraft = <K extends keyof EmployeeAttendanceDraft>(key: K, value: EmployeeAttendanceDraft[K]) => {
		setDraft((current) => ({ ...current, [key]: value }));
		setMessage('');
		setIsError(false);
	};

	const addEntry = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		try {
			setEntries(addEmployeeAttendance(entries, draft));
			setDraft({ ...initialDraft(), date: draft.date, status: draft.status });
			setMessage(storageReady
				? 'Attendance record added and saved in this browser.'
				: 'Record added for this session only because saved browser data could not be read. Export a CSV backup.');
			setIsError(!storageReady);
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Could not add this attendance record.');
			setIsError(true);
		}
	};

	const deleteEntry = (id: string) => {
		setEntries((current) => removeEmployeeAttendance(current, id));
		setMessage('Attendance record removed.');
		setIsError(false);
	};

	const exportCsv = () => {
		if (entries.length === 0) return;
		const csv = createEmployeeAttendanceCsv(entries);
		const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
		triggerDownload(blob, `starmore-employee-attendance-${localDateString(new Date())}.csv`);
		setMessage(`Exported ${entries.length} attendance record${entries.length === 1 ? '' : 's'} as CSV.`);
		setIsError(false);
	};

	return (
		<div>
			<form className="expense-entry-form" onSubmit={addEntry}>
				<div className="expense-entry-fields attendance-entry-fields">
					<div className="calc-field">
						<label htmlFor="attendance-date">Date</label>
						<input id="attendance-date" type="date" required value={draft.date} onChange={(event) => updateDraft('date', event.target.value)} />
					</div>
					<div className="calc-field">
						<label htmlFor="attendance-employee">Employee name</label>
						<input id="attendance-employee" maxLength={EMPLOYEE_ATTENDANCE_MAX_EMPLOYEE_LENGTH} required value={draft.employee} onChange={(event) => updateDraft('employee', event.target.value)} placeholder="Enter employee name" />
					</div>
					<div className="calc-field">
						<label htmlFor="attendance-status">Status</label>
						<select id="attendance-status" value={draft.status} onChange={(event) => {
							if (isOneOf(event.target.value, EMPLOYEE_ATTENDANCE_STATUSES)) updateDraft('status', event.target.value);
						}}>
							{EMPLOYEE_ATTENDANCE_STATUSES.map((status) => <option key={status}>{status}</option>)}
						</select>
					</div>
					<div className="calc-field attendance-note-field">
						<label htmlFor="attendance-note">Note (optional)</label>
						<input id="attendance-note" maxLength={EMPLOYEE_ATTENDANCE_MAX_NOTE_LENGTH} value={draft.note} onChange={(event) => updateDraft('note', event.target.value)} placeholder="Optional detail" />
					</div>
				</div>
				<div className="tool-actions">
					<button className="tool-button" type="submit">Add attendance record</button>
				</div>
			</form>

			<section className="expense-ledger" aria-label="Employee attendance register">
				<div className="expense-ledger-header">
					<div>
						<h2>Attendance register</h2>
						<p>{entries.length} recorded attendance {entries.length === 1 ? 'entry' : 'entries'}</p>
					</div>
					<div className="expense-ledger-actions">
						<div className="calc-field">
							<label htmlFor="attendance-month">Show month</label>
							<input id="attendance-month" type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
						</div>
						<button className="tool-button secondary" type="button" disabled={!entries.length} onClick={exportCsv}>Export all CSV</button>
					</div>
				</div>
				<div className="attendance-summary-cards" aria-label="Attendance status totals for selected month">
					{EMPLOYEE_ATTENDANCE_STATUSES.map((status: EmployeeAttendanceStatus) => (
						<div className="expense-total-card" key={status}>
							<span>{month || 'All dates'} · {status}</span>
							<strong>{totals[status]}</strong>
						</div>
					))}
				</div>
				{visibleEntries.length ? (
					<div className="expense-table-wrap">
						<table className="expense-table attendance-table">
							<thead><tr><th>Date</th><th>Employee</th><th>Status</th><th>Note</th><th><span className="visually-hidden">Actions</span></th></tr></thead>
							<tbody>{visibleEntries.map((entry) => (
								<tr key={entry.id}>
									<td>{entry.date}</td>
									<td>{entry.employee}</td>
									<td><span className={`attendance-status attendance-status-${entry.status.toLowerCase()}`}>{entry.status}</span></td>
									<td>{entry.note || '—'}</td>
									<td><button className="expense-delete-button" type="button" aria-label={`Delete ${entry.employee} attendance for ${entry.date}`} onClick={() => deleteEntry(entry.id)}>Delete</button></td>
								</tr>
							))}</tbody>
						</table>
					</div>
				) : <p className="expense-empty-state">{entries.length ? 'No attendance records for this month.' : 'No attendance records yet. Add the first record above.'}</p>}
			</section>
			<p className={`tool-message${isError ? ' error' : ''}`} role="status">{message}</p>
			<p className="expense-privacy-note">Attendance records stay in this browser on this device. They are not synced or backed up. Export CSV regularly to keep a separate copy.</p>
		</div>
	);
}
