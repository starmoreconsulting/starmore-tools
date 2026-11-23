import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import {
	addJobApplication,
	createEmptyJobApplicationDraft,
	createJobApplicationBackup,
	decodeJobApplicationBackup,
	decodeJobApplicationStorage,
	encodeJobApplicationStorage,
	filterAndSortJobApplications,
	JOB_APPLICATION_MAX_COMPANY_LENGTH,
	JOB_APPLICATION_MAX_NOTES_LENGTH,
	JOB_APPLICATION_MAX_ROLE_LENGTH,
	JOB_APPLICATION_MAX_URL_LENGTH,
	JOB_APPLICATION_STATUSES,
	JOB_APPLICATION_TRACKER_STORAGE_KEY,
	removeJobApplication,
	updateJobApplication,
	type JobApplication,
	type JobApplicationDraft,
	type JobApplicationSort,
	type JobApplicationStatus,
} from '../../engines/job-application-tracker';
import { triggerDownload } from '../../engines/pdf';

function localDateString(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

function draftFromApplication(application: JobApplication): JobApplicationDraft {
	const { id: _id, ...draft } = application;
	return draft;
}

export default function JobApplicationTracker() {
	const [applications, setApplications] = useState<JobApplication[]>([]);
	const [draft, setDraft] = useState<JobApplicationDraft>(() => createEmptyJobApplicationDraft(localDateString(new Date())));
	const [editingId, setEditingId] = useState<string | null>(null);
	const [query, setQuery] = useState('');
	const [status, setStatus] = useState<JobApplicationStatus | 'All statuses'>('All statuses');
	const [followUps, setFollowUps] = useState<'all' | 'upcoming' | 'overdue'>('all');
	const [sort, setSort] = useState<JobApplicationSort>('follow-up');
	const [message, setMessage] = useState('Loading applications saved in this browser.');
	const [isError, setIsError] = useState(false);
	const [storageError, setStorageError] = useState('');
	const [storageReady, setStorageReady] = useState(false);

	useEffect(() => {
		try {
			setApplications(decodeJobApplicationStorage(localStorage.getItem(JOB_APPLICATION_TRACKER_STORAGE_KEY)));
			setMessage('Applications are stored only in this browser on this device.');
			setStorageError('');
			setStorageReady(true);
		} catch (error) {
			const detail = error instanceof Error ? error.message : 'Could not restore saved job applications.';
			setMessage(detail);
			setStorageError(detail);
			setIsError(true);
		}
	}, []);

	useEffect(() => {
		if (!storageReady) return;
		try {
			localStorage.setItem(JOB_APPLICATION_TRACKER_STORAGE_KEY, encodeJobApplicationStorage(applications));
			setStorageError('');
		} catch (error) {
			const detail = error instanceof Error ? ` ${error.message}` : '';
			const storageMessage = `Could not save applications in this browser.${detail} Export a JSON backup before leaving this page.`;
			setMessage(storageMessage);
			setStorageError(storageMessage);
			setIsError(true);
		}
	}, [applications, storageReady]);

	const today = localDateString(new Date());
	const visibleApplications = useMemo(
		() => filterAndSortJobApplications(applications, query, status, followUps, today, sort),
		[applications, query, status, followUps, today, sort],
	);

	const updateDraft = <K extends keyof JobApplicationDraft>(key: K, value: JobApplicationDraft[K]) => {
		setDraft((current) => ({ ...current, [key]: value }));
		setMessage('');
		setIsError(false);
	};

	const saveApplication = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		try {
			setApplications(editingId
				? updateJobApplication(applications, editingId, draft)
				: addJobApplication(applications, draft));
			setDraft(createEmptyJobApplicationDraft(today));
			setEditingId(null);
			setMessage(storageReady
				? `Application ${editingId ? 'updated' : 'added'} and saved in this browser.`
				: 'Application saved for this session only because browser data could not be read. Export a JSON backup.');
			setIsError(!storageReady);
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Could not save this application.');
			setIsError(true);
		}
	};

	const editApplication = (application: JobApplication) => {
		setEditingId(application.id);
		setDraft(draftFromApplication(application));
		setMessage(`Editing ${application.role} at ${application.company}.`);
		setIsError(false);
	};

	const deleteApplication = (application: JobApplication) => {
		setApplications((current) => removeJobApplication(current, application.id));
		if (editingId === application.id) {
			setEditingId(null);
			setDraft(createEmptyJobApplicationDraft(today));
		}
		setMessage(`Removed ${application.role} at ${application.company}.`);
		setIsError(false);
	};

	const cancelEdit = () => {
		setEditingId(null);
		setDraft(createEmptyJobApplicationDraft(today));
		setMessage('Edit cancelled.');
		setIsError(false);
	};

	const exportBackup = () => {
		try {
			const backup = createJobApplicationBackup(applications);
			const blob = new Blob([backup], { type: 'application/json;charset=utf-8' });
			triggerDownload(blob, `starmore-job-applications-${today}.json`);
			setMessage(`Exported ${applications.length} job application${applications.length === 1 ? '' : 's'} as a JSON backup.`);
			setIsError(false);
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Could not create a JSON backup.');
			setIsError(true);
		}
	};

	const importBackup = async (event: ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		event.target.value = '';
		if (!file) return;
		try {
			const imported = decodeJobApplicationBackup(await file.text());
			if (!window.confirm(`Replace all ${applications.length} current application${applications.length === 1 ? '' : 's'} with ${imported.length} imported record${imported.length === 1 ? '' : 's'}?`)) return;
			setApplications(imported);
			setStorageReady(true);
			setEditingId(null);
			setDraft(createEmptyJobApplicationDraft(today));
			setMessage(`Imported ${imported.length} job application${imported.length === 1 ? '' : 's'}.`);
			setIsError(false);
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Could not import this JSON backup.');
			setIsError(true);
		}
	};

	const clearAll = () => {
		if (!window.confirm(`Permanently remove all ${applications.length} job application${applications.length === 1 ? '' : 's'} saved in this browser? This cannot be undone.`)) return;
		setApplications([]);
		setStorageReady(true);
		setEditingId(null);
		setDraft(createEmptyJobApplicationDraft(today));
		setMessage('All job applications were cleared.');
		setIsError(false);
	};

	return (
		<div>
			<form className="expense-entry-form" onSubmit={saveApplication}>
				<div className="expense-entry-fields">
					<div className="calc-field">
						<label htmlFor="job-company">Company</label>
						<input id="job-company" required maxLength={JOB_APPLICATION_MAX_COMPANY_LENGTH} value={draft.company} onChange={(event) => updateDraft('company', event.target.value)} placeholder="Company name" />
					</div>
					<div className="calc-field">
						<label htmlFor="job-role">Role</label>
						<input id="job-role" required maxLength={JOB_APPLICATION_MAX_ROLE_LENGTH} value={draft.role} onChange={(event) => updateDraft('role', event.target.value)} placeholder="Job title" />
					</div>
					<div className="calc-field">
						<label htmlFor="job-url">Job posting URL (optional)</label>
						<input id="job-url" type="url" maxLength={JOB_APPLICATION_MAX_URL_LENGTH} value={draft.url} onChange={(event) => updateDraft('url', event.target.value)} placeholder="https://example.com/job" />
					</div>
					<div className="calc-field">
						<label htmlFor="job-applied-date">Applied date</label>
						<input id="job-applied-date" type="date" required value={draft.appliedDate} onChange={(event) => updateDraft('appliedDate', event.target.value)} />
					</div>
					<div className="calc-field">
						<label htmlFor="job-status">Status</label>
						<select id="job-status" value={draft.status} onChange={(event) => {
							if (JOB_APPLICATION_STATUSES.some((value) => value === event.target.value)) updateDraft('status', event.target.value as JobApplicationStatus);
						}}>
							{JOB_APPLICATION_STATUSES.map((value) => <option key={value}>{value}</option>)}
						</select>
					</div>
					<div className="calc-field">
						<label htmlFor="job-follow-up">Follow-up date (optional)</label>
						<input id="job-follow-up" type="date" value={draft.followUpDate} onChange={(event) => updateDraft('followUpDate', event.target.value)} />
					</div>
					<div className="calc-field">
						<label htmlFor="job-notes">Notes (optional)</label>
						<textarea id="job-notes" maxLength={JOB_APPLICATION_MAX_NOTES_LENGTH} value={draft.notes} onChange={(event) => updateDraft('notes', event.target.value)} placeholder="Interview details, contact, or next steps" />
					</div>
				</div>
				<div className="tool-actions">
					<button className="tool-button" type="submit">{editingId ? 'Save changes' : 'Add application'}</button>
					{editingId && <button className="tool-button secondary" type="button" onClick={cancelEdit}>Cancel edit</button>}
				</div>
			</form>

			<section className="expense-ledger" aria-label="Job application tracker">
				<div className="expense-ledger-header">
					<div>
						<h2>Your applications</h2>
						<p>{applications.length} saved application{applications.length === 1 ? '' : 's'}</p>
					</div>
					<div className="expense-ledger-actions">
						<button className="tool-button secondary" type="button" onClick={exportBackup}>Export JSON backup</button>
						<label className="tool-button secondary" htmlFor="job-import">Import JSON</label>
						<input id="job-import" type="file" accept=".json,application/json" onChange={importBackup} hidden />
						<button className="tool-button secondary" type="button" disabled={!applications.length} onClick={clearAll}>Clear all</button>
					</div>
				</div>
				<div className="expense-entry-fields">
					<div className="calc-field">
						<label htmlFor="job-search">Search applications</label>
						<input id="job-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Company, role, notes…" />
					</div>
					<div className="calc-field">
						<label htmlFor="job-filter-status">Filter by status</label>
						<select id="job-filter-status" value={status} onChange={(event) => setStatus(event.target.value as JobApplicationStatus | 'All statuses')}>
							<option>All statuses</option>
							{JOB_APPLICATION_STATUSES.map((value) => <option key={value}>{value}</option>)}
						</select>
					</div>
					<div className="calc-field">
						<label htmlFor="job-follow-up-filter">Follow-up view</label>
						<select id="job-follow-up-filter" value={followUps} onChange={(event) => setFollowUps(event.target.value as 'all' | 'upcoming' | 'overdue')}>
							<option value="all">All applications</option>
							<option value="upcoming">Upcoming follow-ups</option>
							<option value="overdue">Overdue follow-ups</option>
						</select>
					</div>
					<div className="calc-field">
						<label htmlFor="job-sort">Sort by</label>
						<select id="job-sort" value={sort} onChange={(event) => setSort(event.target.value as JobApplicationSort)}>
							<option value="follow-up">Follow-up date (soonest)</option>
							<option value="applied-newest">Applied date (newest)</option>
							<option value="company">Company name</option>
						</select>
					</div>
				</div>
				{visibleApplications.length ? (
					<div className="expense-table-wrap">
						<table className="expense-table">
							<thead><tr><th>Company / role</th><th>Applied</th><th>Status</th><th>Follow-up</th><th>Notes</th><th><span className="visually-hidden">Actions</span></th></tr></thead>
							<tbody>{visibleApplications.map((application) => {
								const isOverdue = !!application.followUpDate && application.followUpDate < today && !['Rejected', 'Withdrawn', 'Offer'].includes(application.status);
								return (
									<tr key={application.id}>
										<td>
											<strong>{application.company}</strong><br />
											<span>{application.role}</span>
											{application.url && <><br /><a href={application.url} target="_blank" rel="noopener noreferrer">Job posting</a></>}
										</td>
										<td>{application.appliedDate}</td>
										<td>{application.status}</td>
										<td>{application.followUpDate ? <span>{application.followUpDate}{isOverdue && <strong> · Overdue</strong>}</span> : '—'}</td>
										<td>{application.notes || '—'}</td>
										<td>
											<button className="expense-delete-button" type="button" aria-label={`Edit ${application.role} at ${application.company}`} onClick={() => editApplication(application)}>Edit</button>{' '}
											<button className="expense-delete-button" type="button" aria-label={`Delete ${application.role} at ${application.company}`} onClick={() => deleteApplication(application)}>Delete</button>
										</td>
									</tr>
								);
							})}</tbody>
						</table>
					</div>
				) : <p className="expense-empty-state">{applications.length ? 'No applications match these filters.' : 'No applications yet. Add the first one above.'}</p>}
			</section>
			<p className={`tool-message${isError ? ' error' : ''}`} role="status">{message}</p>
			{storageError && <p className="tool-message error" role="alert">{storageError}</p>}
			<p className="expense-privacy-note">Your application data stays in local storage in this browser on this device. It is not uploaded or synced. Export a JSON backup regularly to keep a separate copy.</p>
		</div>
	);
}
