export const JOB_APPLICATION_TRACKER_STORAGE_KEY = 'starmore-job-application-tracker-v1';
export const JOB_APPLICATION_TRACKER_VERSION = 1;
export const JOB_APPLICATION_STATUSES = ['Applied', 'Screening', 'Interview', 'Offer', 'Rejected', 'Withdrawn'] as const;
export const JOB_APPLICATION_MAX_COMPANY_LENGTH = 120;
export const JOB_APPLICATION_MAX_ROLE_LENGTH = 120;
export const JOB_APPLICATION_MAX_URL_LENGTH = 2048;
export const JOB_APPLICATION_MAX_NOTES_LENGTH = 4000;

export type JobApplicationStatus = typeof JOB_APPLICATION_STATUSES[number];

export interface JobApplication {
	id: string;
	company: string;
	role: string;
	url: string;
	appliedDate: string;
	status: JobApplicationStatus;
	followUpDate: string;
	notes: string;
}

export type JobApplicationDraft = Omit<JobApplication, 'id'>;

export type JobApplicationSort = 'follow-up' | 'applied-newest' | 'company';

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isValidDate(value: string, optional = false): boolean {
	if (optional && value === '') return true;
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
	const date = new Date(`${value}T00:00:00Z`);
	return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function validateApplication(value: unknown, index: number): JobApplication {
	if (!isRecord(value)) throw new Error(`Application ${index + 1} must be an object.`);
	const { id, company, role, url, appliedDate, status, followUpDate, notes } = value;
	if (typeof id !== 'string' || id.length < 1 || id.length > 200) throw new Error(`Application ${index + 1} has an invalid ID.`);
	if (typeof company !== 'string' || !company.trim() || company.length > JOB_APPLICATION_MAX_COMPANY_LENGTH) {
		throw new Error(`Application ${index + 1} needs a company name of ${JOB_APPLICATION_MAX_COMPANY_LENGTH} characters or fewer.`);
	}
	if (typeof role !== 'string' || !role.trim() || role.length > JOB_APPLICATION_MAX_ROLE_LENGTH) {
		throw new Error(`Application ${index + 1} needs a role of ${JOB_APPLICATION_MAX_ROLE_LENGTH} characters or fewer.`);
	}
	if (typeof url !== 'string' || url.length > JOB_APPLICATION_MAX_URL_LENGTH) throw new Error(`Application ${index + 1} has an invalid URL.`);
	if (url.trim()) {
		try {
			const parsed = new URL(url);
			if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') throw new Error();
		} catch {
			throw new Error(`Application ${index + 1} URL must be a valid http or https address.`);
		}
	}
	if (typeof appliedDate !== 'string' || !isValidDate(appliedDate)) throw new Error(`Application ${index + 1} has an invalid applied date.`);
	if (typeof status !== 'string' || !JOB_APPLICATION_STATUSES.includes(status as JobApplicationStatus)) throw new Error(`Application ${index + 1} has an invalid status.`);
	if (typeof followUpDate !== 'string' || !isValidDate(followUpDate, true)) throw new Error(`Application ${index + 1} has an invalid follow-up date.`);
	if (typeof notes !== 'string' || notes.length > JOB_APPLICATION_MAX_NOTES_LENGTH) throw new Error(`Application ${index + 1} notes exceed ${JOB_APPLICATION_MAX_NOTES_LENGTH} characters.`);
	return { id, company: company.trim(), role: role.trim(), url: url.trim(), appliedDate, status: status as JobApplicationStatus, followUpDate, notes };
}

export function validateJobApplications(value: unknown): JobApplication[] {
	if (!Array.isArray(value)) throw new Error('Job application backup must contain an applications list.');
	if (value.length > 10000) throw new Error('Job application backup contains too many records (maximum 10,000).');
	const applications = value.map(validateApplication);
	const ids = new Set<string>();
	for (const application of applications) {
		if (ids.has(application.id)) throw new Error(`Duplicate application ID "${application.id}".`);
		ids.add(application.id);
	}
	return applications;
}

export function encodeJobApplicationStorage(applications: JobApplication[]): string {
	return JSON.stringify({ version: JOB_APPLICATION_TRACKER_VERSION, applications: validateJobApplications(applications) });
}

export function decodeJobApplicationStorage(serialized: string | null): JobApplication[] {
	if (serialized === null) return [];
	let value: unknown;
	try {
		value = JSON.parse(serialized);
	} catch {
		throw new Error('Could not read saved job applications: browser data is not valid JSON. Your saved data was left unchanged.');
	}
	if (!isRecord(value) || value.version !== JOB_APPLICATION_TRACKER_VERSION) {
		throw new Error(`Could not read saved job applications: unsupported or invalid data version (expected ${JOB_APPLICATION_TRACKER_VERSION}). Your saved data was left unchanged.`);
	}
	try {
		return validateJobApplications(value.applications);
	} catch (error) {
		throw new Error(`Could not read saved job applications: ${error instanceof Error ? error.message : 'invalid records'}. Your saved data was left unchanged.`);
	}
}

export function decodeJobApplicationBackup(serialized: string): JobApplication[] {
	let value: unknown;
	try {
		value = JSON.parse(serialized);
	} catch {
		throw new Error('This backup is not valid JSON.');
	}
	if (!isRecord(value) || value.version !== JOB_APPLICATION_TRACKER_VERSION) throw new Error('This is not a supported Job Application Tracker backup.');
	return validateJobApplications(value.applications);
}

function createId(): string {
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
	return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function addJobApplication(applications: JobApplication[], draft: JobApplicationDraft): JobApplication[] {
	const entry = validateApplication({ ...draft, id: createId() }, applications.length);
	return [entry, ...applications];
}

export function updateJobApplication(applications: JobApplication[], id: string, draft: JobApplicationDraft): JobApplication[] {
	if (!applications.some((entry) => entry.id === id)) throw new Error('That application could not be found.');
	const updated = validateApplication({ ...draft, id }, 0);
	return applications.map((entry) => entry.id === id ? updated : entry);
}

export function removeJobApplication(applications: JobApplication[], id: string): JobApplication[] {
	return applications.filter((entry) => entry.id !== id);
}

export function filterAndSortJobApplications(
	applications: JobApplication[],
	query: string,
	status: JobApplicationStatus | 'All statuses',
	followUps: 'all' | 'upcoming' | 'overdue',
	today: string,
	sort: JobApplicationSort = 'follow-up',
): JobApplication[] {
	const search = query.trim().toLocaleLowerCase();
	return applications.filter((entry) => {
		const matchesSearch = !search || [entry.company, entry.role, entry.url, entry.notes].some((value) => value.toLocaleLowerCase().includes(search));
		const matchesStatus = status === 'All statuses' || entry.status === status;
		const activeFollowUp = !['Rejected', 'Withdrawn', 'Offer'].includes(entry.status);
		const matchesFollowUp = followUps === 'all'
			|| (activeFollowUp && followUps === 'upcoming' && !!entry.followUpDate && entry.followUpDate >= today)
			|| (activeFollowUp && followUps === 'overdue' && !!entry.followUpDate && entry.followUpDate < today);
		return matchesSearch && matchesStatus && matchesFollowUp;
	}).sort((a, b) => {
		if (sort === 'company') return a.company.localeCompare(b.company) || b.appliedDate.localeCompare(a.appliedDate);
		if (sort === 'applied-newest') return b.appliedDate.localeCompare(a.appliedDate) || a.company.localeCompare(b.company);
		const aFollowUp = a.followUpDate || '9999-12-31';
		const bFollowUp = b.followUpDate || '9999-12-31';
		return aFollowUp.localeCompare(bFollowUp) || b.appliedDate.localeCompare(a.appliedDate) || a.company.localeCompare(b.company);
	});
}

export function createJobApplicationBackup(applications: JobApplication[]): string {
	return JSON.stringify({ version: JOB_APPLICATION_TRACKER_VERSION, exportedAt: new Date().toISOString(), applications: validateJobApplications(applications) }, null, 2);
}

export function createEmptyJobApplicationDraft(today: string): JobApplicationDraft {
	return { company: '', role: '', url: '', appliedDate: today, status: 'Applied', followUpDate: '', notes: '' };
}
