// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MeetingMinutesInput } from '../../engines/meeting-minutes';
import MeetingMinutesGenerator from './MeetingMinutesGenerator';

const { createMeetingMinutesPdf, triggerDownload } = vi.hoisted(() => ({
	createMeetingMinutesPdf: vi.fn(async (_input: MeetingMinutesInput) => new Uint8Array([37, 80, 68, 70])),
	triggerDownload: vi.fn(),
}));

vi.mock('../../engines/meeting-minutes', async (importOriginal) => {
	const original = await importOriginal<typeof import('../../engines/meeting-minutes')>();
	return { ...original, createMeetingMinutesPdf: (input: MeetingMinutesInput) => createMeetingMinutesPdf(input) };
});

vi.mock('../../engines/pdf', () => ({ triggerDownload }));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let container: HTMLDivElement;
let root: Root;

function setValue(selector: string, value: string) {
	const input = container.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector);
	if (!input) throw new Error(`Missing input ${selector}`);
	const prototype = input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
	Object.getOwnPropertyDescriptor(prototype, 'value')?.set?.call(input, value);
	input.dispatchEvent(new Event('input', { bubbles: true }));
	input.dispatchEvent(new Event('change', { bubbles: true }));
}

beforeEach(() => {
	createMeetingMinutesPdf.mockClear();
	triggerDownload.mockClear();
	container = document.createElement('div');
	document.body.append(container);
	root = createRoot(container);
	act(() => root.render(<MeetingMinutesGenerator />));
});

afterEach(() => {
	act(() => root.unmount());
	container.remove();
});

describe('MeetingMinutesGenerator', () => {
	it('shows meeting details, discussion notes, actions, and a live preview', () => {
		expect(container.querySelector('#minutes-title')).not.toBeNull();
		expect(container.querySelector('#minutes-discussion')).not.toBeNull();
		expect(container.querySelector('#minutes-action-task')).not.toBeNull();
		expect(container.querySelector('.meeting-minutes-preview')?.textContent).toContain('MEETING MINUTES');
	});

	it('updates the live preview from meeting detail fields', () => {
		act(() => {
			setValue('#minutes-title', 'Planning Meeting');
			setValue('#minutes-location', 'Meeting room 2');
			setValue('#minutes-discussion', 'Reviewed the launch plan.');
			setValue('#minutes-decisions', 'Launch on 15 December.');
		});
		const preview = container.querySelector('.meeting-minutes-preview');
		expect(preview?.textContent).toContain('Planning Meeting');
		expect(preview?.textContent).toContain('Meeting room 2');
		expect(preview?.textContent).toContain('Reviewed the launch plan.');
		expect(preview?.textContent).toContain('Launch on 15 December.');
	});

	it('adds and removes action items', () => {
		act(() => {
			setValue('#minutes-action-task', 'Share the revised timeline');
			setValue('#minutes-action-owner', 'Alex Morgan');
			setValue('#minutes-action-due', '2026-11-25');
		});
		act(() => container.querySelector<HTMLButtonElement>('.meeting-minutes-form-section button')?.click());
		expect(container.querySelector('.meeting-minutes-preview')?.textContent).toContain('Share the revised timeline');
		expect(container.querySelector('.meeting-minutes-preview')?.textContent).toContain('Alex Morgan');
		act(() => container.querySelector<HTMLButtonElement>('.meeting-action-row button')?.click());
		expect(container.querySelector('.meeting-minutes-preview')?.textContent).toContain('No action items added');
	});

	it('downloads the meeting minutes as a PDF', async () => {
		act(() => {
			setValue('#minutes-title', 'Planning Meeting');
			setValue('#minutes-discussion', 'Reviewed the launch plan.');
		});
		await act(async () => container.querySelector<HTMLButtonElement>('.tool-actions button')?.click());
		expect(createMeetingMinutesPdf).toHaveBeenCalledTimes(1);
		expect(triggerDownload).toHaveBeenCalledTimes(1);
		expect(triggerDownload.mock.calls[0]?.[1]).toMatch(/\.pdf$/);
	});
});
