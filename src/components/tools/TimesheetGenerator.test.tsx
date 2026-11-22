// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import TimesheetGenerator from './TimesheetGenerator';

const { triggerDownload } = vi.hoisted(() => ({ triggerDownload: vi.fn() }));
vi.mock('../../engines/pdf', () => ({ triggerDownload }));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let container: HTMLDivElement;
let root: Root;

function setValue(selector: string, value: string) {
	const input = container.querySelector<HTMLInputElement>(selector);
	if (!input) throw new Error(`Missing input ${selector}`);
	Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, value);
	input.dispatchEvent(new Event('input', { bubbles: true }));
	input.dispatchEvent(new Event('change', { bubbles: true }));
}

beforeEach(() => {
	triggerDownload.mockClear();
	container = document.createElement('div');
	document.body.append(container);
	root = createRoot(container);
	act(() => root.render(<TimesheetGenerator />));
});

afterEach(() => {
	act(() => root.unmount());
	container.remove();
});

describe('TimesheetGenerator', () => {
	it('shows employee and week details with a seven-day entry grid', () => {
		expect(container.querySelector('#timesheet-employee')).not.toBeNull();
		expect(container.querySelector('#timesheet-week-start')).not.toBeNull();
		expect(container.querySelectorAll('.timesheet-table tbody tr')).toHaveLength(7);
	});

	it('calculates worked time after break deductions and updates weekly total', () => {
		const start = container.querySelector<HTMLInputElement>('#timesheet-week-start')?.value;
		if (!start) throw new Error('Missing week start date');
		const dateLabel = new Intl.DateTimeFormat('en', { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(`${start}T00:00:00`));
		act(() => {
			setValue('#timesheet-employee', 'Jordan Lee');
			setValue(`[aria-label="Start time ${dateLabel}"]`, '09:00');
			setValue(`[aria-label="End time ${dateLabel}"]`, '17:30');
			setValue(`[aria-label="Break minutes ${dateLabel}"]`, '30');
		});
		expect(container.querySelector('.timesheet-total')?.textContent).toContain('8:00 (8.00 hours)');
		expect(container.querySelector('.timesheet-table tbody')?.textContent).toContain('8:00');
	});

	it('disables PDF export for invalid times', () => {
		const start = container.querySelector<HTMLInputElement>('#timesheet-week-start')?.value;
		if (!start) throw new Error('Missing week start date');
		const dateLabel = new Intl.DateTimeFormat('en', { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(`${start}T00:00:00`));
		act(() => {
			setValue('#timesheet-employee', 'Jordan Lee');
			setValue(`[aria-label="Start time ${dateLabel}"]`, '17:00');
			setValue(`[aria-label="End time ${dateLabel}"]`, '09:00');
		});
		expect(container.querySelector<HTMLButtonElement>('.tool-actions button')?.disabled).toBe(true);
		expect(container.querySelector('[role="status"]')?.textContent).toContain('Overnight shifts are not supported');
	});

	it('keeps the form usable while the week start date is empty', () => {
		act(() => {
			setValue('#timesheet-employee', 'Jordan Lee');
			setValue('#timesheet-week-start', '');
		});
		expect(container.querySelectorAll('.timesheet-table tbody tr')).toHaveLength(7);
		expect(container.querySelector('[role="status"]')?.textContent).toContain('valid week start date');
		expect(container.querySelector<HTMLButtonElement>('.tool-actions button')?.disabled).toBe(true);
	});

	it('downloads the completed timesheet as PDF', async () => {
		act(() => setValue('#timesheet-employee', 'Jordan Lee'));
		await act(async () => container.querySelector<HTMLButtonElement>('.tool-actions button')?.click());
		expect(triggerDownload).toHaveBeenCalledTimes(1);
		expect(triggerDownload.mock.calls[0]?.[0]).toBeInstanceOf(Blob);
		expect(triggerDownload.mock.calls[0]?.[1]).toMatch(/Jordan-Lee\.pdf$/);
	});
});
