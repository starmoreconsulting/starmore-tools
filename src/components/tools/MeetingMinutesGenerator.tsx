import { useState } from 'react';
import {
	createMeetingMinutesPdf,
	MEETING_MINUTES_MAX_ITEMS,
	MEETING_MINUTES_MAX_TEXT_LENGTH,
	MEETING_MINUTES_MAX_TITLE_LENGTH,
	type MeetingMinutesAction,
	type MeetingMinutesInput,
} from '../../engines/meeting-minutes';
import { triggerDownload } from '../../engines/pdf';

function localDateString(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

function initialMinutes(): MeetingMinutesInput {
	return {
		meetingTitle: '',
		meetingDate: localDateString(new Date()),
		startTime: '',
		endTime: '',
		location: '',
		facilitator: '',
		recorder: '',
		attendees: '',
		agenda: '',
		discussion: '',
		decisions: '',
		actions: [],
		nextMeeting: '',
	};
}

function safeFilename(value: string): string {
	const name = value.trim().replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 60);
	return `${name || 'meeting-minutes'}.pdf`;
}

function formatDate(value: string): string {
	if (!value) return '—';
	const date = new Date(`${value}T00:00:00`);
	return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en', { dateStyle: 'long' }).format(date);
}

export default function MeetingMinutesGenerator() {
	const [minutes, setMinutes] = useState(initialMinutes);
	const [actionDraft, setActionDraft] = useState({ task: '', owner: '', dueDate: '' });
	const [message, setMessage] = useState('Your meeting minutes are prepared locally in this browser.');
	const [busy, setBusy] = useState(false);

	const updateField = <K extends keyof MeetingMinutesInput>(key: K, value: MeetingMinutesInput[K]) => {
		setMinutes((current) => ({ ...current, [key]: value }));
		setMessage('');
	};

	const addAction = () => {
		if (!actionDraft.task.trim()) {
			setMessage('Enter an action item before adding it.');
			return;
		}
		if (minutes.actions.length >= MEETING_MINUTES_MAX_ITEMS) {
			setMessage(`A meeting can include up to ${MEETING_MINUTES_MAX_ITEMS} action items.`);
			return;
		}
		const action: MeetingMinutesAction = { ...actionDraft, id: crypto.randomUUID() };
		setMinutes((current) => ({ ...current, actions: [...current.actions, action] }));
		setActionDraft({ task: '', owner: '', dueDate: '' });
		setMessage('Action item added.');
	};

	const removeAction = (id: string) => {
		setMinutes((current) => ({ ...current, actions: current.actions.filter((action) => action.id !== id) }));
		setMessage('Action item removed.');
	};

	const downloadPdf = async () => {
		setBusy(true);
		setMessage('');
		try {
			const bytes = await createMeetingMinutesPdf(minutes);
			triggerDownload(new Blob([bytes], { type: 'application/pdf' }), safeFilename(minutes.meetingTitle));
			setMessage('Meeting minutes PDF downloaded.');
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Could not create the meeting minutes PDF.');
		} finally {
			setBusy(false);
		}
	};

	const textField = (
		key: 'attendees' | 'agenda' | 'discussion' | 'decisions' | 'nextMeeting',
		id: string,
		label: string,
		placeholder: string,
		required = false,
		rows = 4,
	) => (
		<div className="calc-field">
			<label htmlFor={id}>{label}{required ? ' *' : ''}</label>
			<textarea
				id={id}
				maxLength={MEETING_MINUTES_MAX_TEXT_LENGTH}
				rows={rows}
				required={required}
				value={minutes[key]}
				onChange={(event) => updateField(key, event.target.value)}
				placeholder={placeholder}
			/>
		</div>
	);

	const timeRange = minutes.startTime && minutes.endTime
		? `${minutes.startTime} – ${minutes.endTime}`
		: minutes.startTime || minutes.endTime || 'Time not specified';

	return (
		<div>
			<div className="meeting-minutes-columns">
				<div className="meeting-minutes-form">
					<section className="meeting-minutes-form-section">
						<h2>Meeting details</h2>
						<div className="calc-fields">
							<div className="calc-field meeting-minutes-full-width">
								<label htmlFor="minutes-title">Meeting title *</label>
								<input id="minutes-title" maxLength={MEETING_MINUTES_MAX_TITLE_LENGTH} required value={minutes.meetingTitle} onChange={(event) => updateField('meetingTitle', event.target.value)} placeholder="Project planning meeting" />
							</div>
							<div className="calc-field">
								<label htmlFor="minutes-date">Date</label>
								<input id="minutes-date" type="date" value={minutes.meetingDate} onChange={(event) => updateField('meetingDate', event.target.value)} />
							</div>
							<div className="meeting-time-fields">
								<div className="calc-field">
									<label htmlFor="minutes-start-time">Start time</label>
									<input id="minutes-start-time" type="time" value={minutes.startTime} onChange={(event) => updateField('startTime', event.target.value)} />
								</div>
								<div className="calc-field">
									<label htmlFor="minutes-end-time">End time</label>
									<input id="minutes-end-time" type="time" value={minutes.endTime} onChange={(event) => updateField('endTime', event.target.value)} />
								</div>
							</div>
							<div className="calc-field">
								<label htmlFor="minutes-location">Location / meeting link</label>
								<input id="minutes-location" maxLength={MEETING_MINUTES_MAX_TITLE_LENGTH} value={minutes.location} onChange={(event) => updateField('location', event.target.value)} placeholder="Office or video call" />
							</div>
							<div className="calc-field">
								<label htmlFor="minutes-facilitator">Facilitator</label>
								<input id="minutes-facilitator" maxLength={MEETING_MINUTES_MAX_TITLE_LENGTH} value={minutes.facilitator} onChange={(event) => updateField('facilitator', event.target.value)} />
							</div>
							<div className="calc-field">
								<label htmlFor="minutes-recorder">Minutes recorded by</label>
								<input id="minutes-recorder" maxLength={MEETING_MINUTES_MAX_TITLE_LENGTH} value={minutes.recorder} onChange={(event) => updateField('recorder', event.target.value)} />
							</div>
						</div>
					</section>

					<section className="meeting-minutes-form-section">
						<h2>Meeting record</h2>
						<div className="meeting-minutes-text-fields">
							{textField('attendees', 'minutes-attendees', 'Attendees', 'List names and roles, one per line.')}
							{textField('agenda', 'minutes-agenda', 'Agenda', 'List the topics covered, one per line.')}
							{textField('discussion', 'minutes-discussion', 'Discussion notes', 'Summarize key points discussed.', true, 6)}
							{textField('decisions', 'minutes-decisions', 'Decisions', 'Record decisions made, one per line.')}
						</div>
					</section>

					<section className="meeting-minutes-form-section">
						<div className="meeting-action-heading">
							<div>
								<h2>Action items</h2>
								<p>{minutes.actions.length} of {MEETING_MINUTES_MAX_ITEMS} actions</p>
							</div>
						</div>
						<div className="meeting-action-fields">
							<div className="calc-field">
								<label htmlFor="minutes-action-task">Action *</label>
								<input id="minutes-action-task" maxLength={MEETING_MINUTES_MAX_TEXT_LENGTH} value={actionDraft.task} onChange={(event) => setActionDraft((current) => ({ ...current, task: event.target.value }))} placeholder="What needs to be done?" />
							</div>
							<div className="calc-field">
								<label htmlFor="minutes-action-owner">Owner</label>
								<input id="minutes-action-owner" maxLength={MEETING_MINUTES_MAX_TITLE_LENGTH} value={actionDraft.owner} onChange={(event) => setActionDraft((current) => ({ ...current, owner: event.target.value }))} placeholder="Person responsible" />
							</div>
							<div className="calc-field">
								<label htmlFor="minutes-action-due">Due date</label>
								<input id="minutes-action-due" type="date" value={actionDraft.dueDate} onChange={(event) => setActionDraft((current) => ({ ...current, dueDate: event.target.value }))} />
							</div>
						</div>
						<button className="tool-button secondary" type="button" disabled={minutes.actions.length >= MEETING_MINUTES_MAX_ITEMS} onClick={addAction}>Add action item</button>
						{minutes.actions.length > 0 && (
							<div className="meeting-action-list">
								{minutes.actions.map((action) => (
									<div className="meeting-action-row" key={action.id}>
										<div><strong>{action.task}</strong><span>{[action.owner, action.dueDate].filter(Boolean).join(' · ') || 'No owner or due date'}</span></div>
										<button className="expense-delete-button" type="button" aria-label={`Delete ${action.task}`} onClick={() => removeAction(action.id)}>Delete</button>
									</div>
								))}
							</div>
						)}
					</section>

					<section className="meeting-minutes-form-section">
						<h2>Next meeting</h2>
						{textField('nextMeeting', 'minutes-next-meeting', 'Date, time, or follow-up details', 'Add the next meeting date or planned follow-up.', false, 3)}
					</section>

					<div className="tool-actions">
						<button className="tool-button" type="button" disabled={busy} onClick={downloadPdf}>
							{busy ? 'Preparing PDF…' : 'Download minutes PDF'}
						</button>
					</div>
					<p className="tool-message" role="status">{message}</p>
				</div>

				<section className="meeting-minutes-preview" aria-label="Meeting minutes preview">
					<header className="meeting-minutes-preview-header">
						<p className="invoice-generator-kicker">MEETING MINUTES</p>
						<h2>{minutes.meetingTitle || 'Meeting title'}</h2>
						<p>{formatDate(minutes.meetingDate)} · {timeRange}</p>
						{minutes.location && <p>{minutes.location}</p>}
					</header>
					<div className="meeting-minutes-facts">
						{minutes.facilitator && <p><span>FACILITATOR</span><strong>{minutes.facilitator}</strong></p>}
						{minutes.recorder && <p><span>RECORDED BY</span><strong>{minutes.recorder}</strong></p>}
					</div>
					{[
						['Attendees', minutes.attendees],
						['Agenda', minutes.agenda],
						['Discussion notes', minutes.discussion],
						['Decisions', minutes.decisions],
					].map(([heading, content]) => (
						<section className="meeting-minutes-preview-section" key={heading}>
							<h3>{heading}</h3>
							<p>{content || `No ${heading.toLowerCase()} added.`}</p>
						</section>
					))}
					<section className="meeting-minutes-preview-section">
						<h3>Action items</h3>
						{minutes.actions.length ? (
							<ul>{minutes.actions.map((action) => (
								<li key={action.id}>
									<span>{action.task}</span>
									<small>{[action.owner, action.dueDate].filter(Boolean).join(' · ') || 'No owner or due date'}</small>
								</li>
							))}</ul>
						) : <p>No action items added.</p>}
					</section>
					{minutes.nextMeeting && (
						<section className="meeting-minutes-preview-section">
							<h3>Next meeting</h3>
							<p>{minutes.nextMeeting}</p>
						</section>
					)}
					{!minutes.discussion && <p className="meeting-minutes-empty">Add discussion notes to complete this record.</p>}
				</section>
			</div>
			<p className="expense-privacy-note">Meeting notes are prepared in this browser and are not saved or uploaded. PDF export uses a built-in font that supports basic Latin and Western European characters.</p>
		</div>
	);
}
