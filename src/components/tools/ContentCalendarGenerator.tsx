import { useState } from 'react';
import {
	formatCalendarCsv,
	formatCalendarIcs,
	type ContentCalendarEntry,
} from '../../engines/social-content';

function downloadText(contents: string, filename: string, type: string) {
	const url = URL.createObjectURL(new Blob([contents], { type }));
	const anchor = document.createElement('a');
	anchor.href = url;
	anchor.download = filename;
	anchor.click();
	window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function ContentCalendarGenerator() {
	const [entries, setEntries] = useState<ContentCalendarEntry[]>([{ date: '', platform: '', content: '' }]);
	const [message, setMessage] = useState('Plan posts locally, then export a CSV for spreadsheets or an ICS calendar file.');

	const update = (index: number, key: keyof ContentCalendarEntry, value: string) => {
		setEntries((current) => current.map((entry, itemIndex) => itemIndex === index ? { ...entry, [key]: value } : entry));
		setMessage('');
	};
	const hasScheduledEntries = entries.some((entry) => entry.date && entry.platform && entry.content.trim());
	const exportFile = (format: 'csv' | 'ics') => {
		const usable = entries.filter((entry) => entry.date && entry.platform.trim() && entry.content.trim());
		if (!usable.length) {
			setMessage('Add a date, platform, and content idea to at least one entry before exporting.');
			return;
		}
		const csv = format === 'csv';
		downloadText(csv ? formatCalendarCsv(usable) : formatCalendarIcs(usable), `content-calendar.${format}`, csv ? 'text/csv;charset=utf-8' : 'text/calendar;charset=utf-8');
		setMessage(`${usable.length} calendar ${usable.length === 1 ? 'entry' : 'entries'} exported as ${format.toUpperCase()}.`);
	};

	return (
		<section aria-label="Content calendar">
			<p>Add planned publication dates, platforms, and content notes. Incomplete rows are skipped during export; calendar entries are all-day events.</p>
			{entries.map((entry, index) => (
				<fieldset className="calc-fields" key={index}>
					<legend>Content item {index + 1}</legend>
					<div className="calc-field">
						<label htmlFor={`calendar-date-${index}`}>Date</label>
						<input id={`calendar-date-${index}`} type="date" value={entry.date} onChange={(event) => update(index, 'date', event.target.value)} />
					</div>
					<div className="calc-field">
						<label htmlFor={`calendar-platform-${index}`}>Platform</label>
						<input id={`calendar-platform-${index}`} value={entry.platform} placeholder="e.g. Instagram" onChange={(event) => update(index, 'platform', event.target.value)} />
					</div>
					<div className="calc-field">
						<label htmlFor={`calendar-content-${index}`}>Content idea / notes</label>
						<textarea id={`calendar-content-${index}`} rows={3} value={entry.content} placeholder="Describe the planned post" onChange={(event) => update(index, 'content', event.target.value)} />
					</div>
					<button className="tool-button secondary" type="button" aria-label={`Remove content item ${index + 1}`} onClick={() => setEntries((current) => current.filter((_, itemIndex) => itemIndex !== index))}>Remove item</button>
				</fieldset>
			))}
			<div className="tool-actions">
				<button className="tool-button secondary" type="button" onClick={() => setEntries((current) => [...current, { date: '', platform: '', content: '' }])}>Add content item</button>
				<button className="tool-button" type="button" disabled={!hasScheduledEntries} onClick={() => exportFile('csv')}>Export CSV</button>
				<button className="tool-button" type="button" disabled={!hasScheduledEntries} onClick={() => exportFile('ics')}>Export ICS</button>
			</div>
			<p className="tool-message" role="status">{message}</p>
		</section>
	);
}
