import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import {
	createMeetingMinutesPdf,
	validateMeetingMinutes,
	type MeetingMinutesInput,
} from './meeting-minutes';

const minutes: MeetingMinutesInput = {
	meetingTitle: 'Website Project Planning',
	meetingDate: '2026-11-22',
	startTime: '10:00',
	endTime: '11:00',
	location: 'Meeting room 2',
	facilitator: 'Jordan Lee',
	recorder: 'Alex Morgan',
	attendees: 'Jordan Lee\nAlex Morgan\nSam Taylor',
	agenda: 'Project timeline\nContent requirements',
	discussion: 'The team reviewed the project timeline and agreed to confirm content owners.',
	decisions: 'Launch target remains 15 December.',
	actions: [
		{ id: 'action-1', task: 'Share the revised timeline', owner: 'Alex Morgan', dueDate: '2026-11-25' },
	],
	nextMeeting: '27 November at 10:00.',
};

describe('meeting minutes', () => {
	it('accepts a complete meeting record', () => {
		expect(() => validateMeetingMinutes(minutes)).not.toThrow();
	});

	it('validates required fields, date, and time order', () => {
		expect(() => validateMeetingMinutes({ ...minutes, meetingTitle: '' })).toThrow('Meeting title is required');
		expect(() => validateMeetingMinutes({ ...minutes, discussion: ' ' })).toThrow('Discussion notes is required');
		expect(() => validateMeetingMinutes({ ...minutes, meetingDate: '2026-02-30' })).toThrow('valid meeting date');
		expect(() => validateMeetingMinutes({ ...minutes, startTime: '25:00' })).toThrow('valid meeting times');
		expect(() => validateMeetingMinutes({ ...minutes, startTime: '11:00', endTime: '10:00' })).toThrow('end time cannot be earlier');
	});

	it('validates action items and text limits', () => {
		expect(() => validateMeetingMinutes({ ...minutes, actions: [{ id: 'bad', task: ' ', owner: '', dueDate: '' }] })).toThrow('Action item 1 has invalid details');
		expect(() => validateMeetingMinutes({ ...minutes, actions: [{ id: 'same', task: 'Task one', owner: '', dueDate: '' }, { id: 'same', task: 'Task two', owner: '', dueDate: '' }] })).toThrow('unique identifiers');
		expect(() => validateMeetingMinutes({ ...minutes, agenda: 'a'.repeat(2001) })).toThrow('2000 characters or fewer');
	});

	it('creates a PDF with the meeting record and multiple pages for many actions', async () => {
		const document = await PDFDocument.load(await createMeetingMinutesPdf(minutes));
		expect(document.getPageCount()).toBe(1);
		const actions = Array.from({ length: 50 }, (_, index) => ({
			id: `action-${index}`,
			task: `Prepare follow-up deliverable number ${index + 1}`,
			owner: 'Alex Morgan',
			dueDate: '2026-12-01',
		}));
		const multipage = await PDFDocument.load(await createMeetingMinutesPdf({ ...minutes, actions }));
		expect(multipage.getPageCount()).toBeGreaterThan(1);
	});

	it('reports characters unsupported by the standard PDF font', async () => {
		await expect(createMeetingMinutesPdf({ ...minutes, meetingTitle: 'Planning 東京' })).rejects.toThrow('supports basic Latin');
	});
});
