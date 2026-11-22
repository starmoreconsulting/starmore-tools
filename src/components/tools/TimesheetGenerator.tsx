import { useMemo, useState } from 'react';
import {
	calculateTimesheet,
	createTimesheetPdf,
	TIMESHEET_DAYS_PER_WEEK,
	TIMESHEET_MAX_NAME_LENGTH,
	TIMESHEET_MAX_NOTE_LENGTH,
	TIMESHEET_MAX_PROJECT_LENGTH,
	type TimesheetDay,
	type TimesheetInput,
} from '../../engines/timesheet';
import { triggerDownload } from '../../engines/pdf';

function localDateString(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

function shiftDate(value: string, offset: number): string {
	if (!value) return '';
	const date = new Date(`${value}T00:00:00`);
	if (Number.isNaN(date.getTime()) || localDateString(date) !== value) return '';
	date.setDate(date.getDate() + offset);
	return localDateString(date);
}

function emptyDay(): TimesheetDay {
	return { startTime: '', endTime: '', breakMinutes: 0, note: '' };
}

function initialTimesheet(): TimesheetInput {
	const today = new Date();
	const mondayOffset = (today.getDay() + 6) % 7;
	const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - mondayOffset);
	return {
		employee: '',
		company: '',
		project: '',
		weekStart: localDateString(monday),
		days: Array.from({ length: TIMESHEET_DAYS_PER_WEEK }, emptyDay),
	};
}

function safeFilename(value: string): string {
	const name = value.trim().replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 60);
	return `${name || 'weekly-timesheet'}.pdf`;
}

function formatMinutes(minutes: number): string {
	return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`;
}

function formatDay(value: string): string {
	if (!value) return 'Choose week start';
	const date = new Date(`${value}T00:00:00`);
	return new Intl.DateTimeFormat('en', { weekday: 'short', month: 'short', day: 'numeric' }).format(date);
}

export default function TimesheetGenerator() {
	const [timesheet, setTimesheet] = useState(initialTimesheet);
	const [message, setMessage] = useState('Your timesheet is prepared locally in this browser.');
	const [busy, setBusy] = useState(false);
	const calculation = useMemo(() => {
		try {
			return { summary: calculateTimesheet(timesheet), error: '' };
		} catch (error) {
			return {
				summary: null,
				error: error instanceof Error ? error.message : 'Check the timesheet details and daily entries.',
			};
		}
	}, [timesheet]);
	const summary = calculation.summary;

	const updateField = <K extends keyof Omit<TimesheetInput, 'days'>>(key: K, value: TimesheetInput[K]) => {
		setTimesheet((current) => ({ ...current, [key]: value }));
		setMessage('');
	};

	const updateDay = <K extends keyof TimesheetDay>(index: number, key: K, value: TimesheetDay[K]) => {
		setTimesheet((current) => ({
			...current,
			days: current.days.map((day, dayIndex) => dayIndex === index ? { ...day, [key]: value } : day),
		}));
		setMessage('');
	};

	const downloadPdf = async () => {
		setBusy(true);
		setMessage('');
		try {
			const bytes = await createTimesheetPdf(timesheet);
			triggerDownload(new Blob([bytes], { type: 'application/pdf' }), safeFilename(timesheet.employee));
			setMessage('Timesheet PDF downloaded.');
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Could not create the timesheet PDF.');
		} finally {
			setBusy(false);
		}
	};

	return (
		<div>
			<section className="timesheet-details">
				<h2>Timesheet details</h2>
				<div className="calc-fields">
					<div className="calc-field">
						<label htmlFor="timesheet-employee">Employee name *</label>
						<input id="timesheet-employee" maxLength={TIMESHEET_MAX_NAME_LENGTH} value={timesheet.employee} onChange={(event) => updateField('employee', event.target.value)} placeholder="Employee name" />
					</div>
					<div className="calc-field">
						<label htmlFor="timesheet-company">Company (optional)</label>
						<input id="timesheet-company" maxLength={TIMESHEET_MAX_NAME_LENGTH} value={timesheet.company} onChange={(event) => updateField('company', event.target.value)} placeholder="Company or organization" />
					</div>
					<div className="calc-field">
						<label htmlFor="timesheet-project">Project (optional)</label>
						<input id="timesheet-project" maxLength={TIMESHEET_MAX_PROJECT_LENGTH} value={timesheet.project} onChange={(event) => updateField('project', event.target.value)} placeholder="Project or client" />
					</div>
					<div className="calc-field">
						<label htmlFor="timesheet-week-start">Week starting</label>
						<input id="timesheet-week-start" type="date" required value={timesheet.weekStart} onChange={(event) => updateField('weekStart', event.target.value)} />
					</div>
				</div>
			</section>

			<section className="timesheet-entry-section" aria-label="Daily working hours">
				<div className="timesheet-section-heading">
					<div>
						<h2>Daily hours</h2>
						<p>Enter start and end times in 24-hour format. Breaks are deducted from elapsed time.</p>
					</div>
				</div>
				<div className="timesheet-table-wrap">
					<table className="timesheet-table">
						<thead><tr><th>Day</th><th>Start</th><th>End</th><th>Break (min)</th><th>Hours</th><th>Note</th></tr></thead>
						<tbody>{timesheet.days.map((day, index) => {
							const date = shiftDate(timesheet.weekStart, index);
							const dayTotal = summary?.days[index]?.workedMinutes;
							return (
								<tr key={`${date}-${index}`}>
									<th scope="row">{formatDay(date)}</th>
									<td><input aria-label={`Start time ${formatDay(date)}`} type="time" value={day.startTime} onChange={(event) => updateDay(index, 'startTime', event.target.value)} /></td>
									<td><input aria-label={`End time ${formatDay(date)}`} type="time" value={day.endTime} onChange={(event) => updateDay(index, 'endTime', event.target.value)} /></td>
									<td><input aria-label={`Break minutes ${formatDay(date)}`} type="number" min="0" max="1440" step="1" inputMode="numeric" value={day.breakMinutes || ''} onChange={(event) => updateDay(index, 'breakMinutes', event.target.value === '' ? 0 : Number(event.target.value))} placeholder="0" /></td>
									<td>{dayTotal === undefined ? '—' : formatMinutes(dayTotal)}</td>
									<td><input aria-label={`Note ${formatDay(date)}`} maxLength={TIMESHEET_MAX_NOTE_LENGTH} value={day.note} onChange={(event) => updateDay(index, 'note', event.target.value)} placeholder="Optional" /></td>
								</tr>
							);
						})}</tbody>
					</table>
				</div>
				<p className="inline-note">Overnight shifts are not supported. Leave both time fields blank for a day with no hours.</p>
			</section>

			<div className="timesheet-total" aria-live="polite">
				<span>TOTAL HOURS THIS WEEK</span>
				<strong>{summary ? `${formatMinutes(summary.totalWorkedMinutes)} (${summary.totalHours.toFixed(2)} hours)` : 'Check daily time and break entries'}</strong>
			</div>
			<div className="tool-actions">
				<button className="tool-button" type="button" disabled={busy || !summary || !timesheet.employee.trim()} onClick={downloadPdf}>{busy ? 'Preparing PDF…' : 'Download timesheet PDF'}</button>
			</div>
			<p className={`tool-message${!summary ? ' error' : ''}`} role="status">{!summary ? calculation.error : message}</p>
			<p className="timesheet-privacy-note">Your timesheet is generated in this browser and is not saved or uploaded.</p>
		</div>
	);
}
