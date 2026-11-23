import { describe, expect, it } from 'vitest';
import {
	addJobApplication,
	createJobApplicationBackup,
	decodeJobApplicationBackup,
	decodeJobApplicationStorage,
	encodeJobApplicationStorage,
	filterAndSortJobApplications,
	removeJobApplication,
	updateJobApplication,
	type JobApplicationDraft,
	type JobApplication,
} from './job-application-tracker';

const draft: JobApplicationDraft = {
	company: 'Northstar',
	role: 'Product Designer',
	url: 'https://example.com/jobs/1',
	appliedDate: '2026-03-10',
	status: 'Applied',
	followUpDate: '2026-03-20',
	notes: 'Ask for the hiring manager',
};

function application(id: string, values: Partial<JobApplicationDraft> = {}): JobApplication {
	return { id, ...draft, ...values };
}

describe('job application tracker engine', () => {
	it('encodes versioned storage and reads missing storage as empty', () => {
		const entries = [application('job-1')];
		expect(decodeJobApplicationStorage(null)).toEqual([]);
		expect(JSON.parse(encodeJobApplicationStorage(entries))).toEqual({ version: 1, applications: entries });
		expect(decodeJobApplicationStorage(encodeJobApplicationStorage(entries))).toEqual(entries);
	});

	it('preserves invalid or unsupported saved data by reporting a validation error', () => {
		expect(() => decodeJobApplicationStorage('{broken')).toThrow(/not valid JSON/);
		expect(() => decodeJobApplicationStorage(JSON.stringify({ version: 9, applications: [] }))).toThrow(/unsupported or invalid data version/);
		expect(() => decodeJobApplicationStorage(JSON.stringify({ version: 1, applications: [{ ...application('x'), appliedDate: '2026-02-30' }] }))).toThrow(/invalid applied date/);
		expect(() => decodeJobApplicationStorage(JSON.stringify({ version: 1, applications: [{ ...application('x'), url: 'javascript:alert(1)' }] }))).toThrow(/http or https/);
	});

	it('adds, edits, and removes applications without mutating earlier records', () => {
		const added = addJobApplication([], draft);
		expect(added).toHaveLength(1);
		expect(added[0]?.company).toBe('Northstar');
		const updated = updateJobApplication(added, added[0]!.id, { ...draft, status: 'Interview' });
		expect(updated[0]?.status).toBe('Interview');
		expect(added[0]?.status).toBe('Applied');
		expect(removeJobApplication(updated, added[0]!.id)).toEqual([]);
	});

	it('filters and orders follow-ups, statuses, and search results', () => {
		const entries = [
			application('later', { company: 'Zebra', followUpDate: '2026-04-02' }),
			application('due', { company: 'Acme', followUpDate: '2026-03-20', status: 'Interview' }),
			application('offer', { company: 'Old offer', followUpDate: '2026-03-01', status: 'Offer' }),
			application('none', { company: 'Elsewhere', followUpDate: '' }),
		];
		expect(filterAndSortJobApplications(entries, '', 'All statuses', 'all', '2026-03-25').map(({ id }) => id)).toEqual(['offer', 'due', 'later', 'none']);
		expect(filterAndSortJobApplications(entries, '', 'All statuses', 'overdue', '2026-03-25').map(({ id }) => id)).toEqual(['due']);
		expect(filterAndSortJobApplications(entries, 'zeb', 'All statuses', 'all', '2026-03-25').map(({ id }) => id)).toEqual(['later']);
		expect(filterAndSortJobApplications(entries, '', 'Interview', 'all', '2026-03-25').map(({ id }) => id)).toEqual(['due']);
	});

	it('creates JSON backups that can be imported and rejects malformed backups', () => {
		const entries = [application('job-1')];
		expect(decodeJobApplicationBackup(createJobApplicationBackup(entries))).toEqual(entries);
		expect(() => decodeJobApplicationBackup('[]')).toThrow(/not a supported/);
		expect(() => decodeJobApplicationBackup('not json')).toThrow(/not valid JSON/);
	});
});
