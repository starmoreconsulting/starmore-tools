// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EMPLOYEE_ATTENDANCE_STORAGE_KEY } from '../../engines/employee-attendance';
import EmployeeAttendanceTracker from './EmployeeAttendanceTracker';

const { triggerDownload } = vi.hoisted(() => ({ triggerDownload: vi.fn() }));
vi.mock('../../engines/pdf', () => ({ triggerDownload }));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let container: HTMLDivElement;
let root: Root;

async function renderTracker() {
	container = document.createElement('div');
	document.body.append(container);
	root = createRoot(container);
	await act(async () => { root.render(<EmployeeAttendanceTracker />); });
}

async function addAttendance(employee = 'Jordan Lee', status = 'Present') {
	await act(async () => {
		const setInputValue = (selector: string, value: string) => {
			const input = container.querySelector<HTMLInputElement | HTMLSelectElement>(selector);
			if (!input) throw new Error(`Missing input ${selector}`);
			const prototype = input instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
			Object.getOwnPropertyDescriptor(prototype, 'value')?.set?.call(input, value);
			input.dispatchEvent(new Event('input', { bubbles: true }));
			input.dispatchEvent(new Event('change', { bubbles: true }));
		};
		setInputValue('#attendance-employee', employee);
		setInputValue('#attendance-status', status);
	});
	await act(async () => {
		const form = container.querySelector('form');
		if (!form) throw new Error('Missing attendance form');
		form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
	});
}

beforeEach(() => {
	localStorage.clear();
	triggerDownload.mockClear();
});

afterEach(() => {
	if (root) act(() => root.unmount());
	container?.remove();
	localStorage.clear();
});

describe('EmployeeAttendanceTracker', () => {
	it('shows a local attendance form and monthly register', async () => {
		await renderTracker();
		expect(container.querySelector('#attendance-employee')).not.toBeNull();
		expect(container.querySelector('#attendance-status')).not.toBeNull();
		expect(container.querySelector('.attendance-summary-cards')).not.toBeNull();
		expect(container.textContent).toContain('No attendance records yet');
	});

	it('adds records, summarizes statuses, and saves them locally', async () => {
		await renderTracker();
		await addAttendance();
		await addAttendance('Alex Kim', 'Late');
		expect(container.querySelector('.attendance-table')?.textContent).toContain('Jordan Lee');
		expect(container.querySelector('.attendance-table')?.textContent).toContain('Alex Kim');
		expect(container.querySelector('.attendance-summary-cards')?.textContent).toContain('Present1');
		expect(container.querySelector('.attendance-summary-cards')?.textContent).toContain('Late1');
		expect(JSON.parse(localStorage.getItem(EMPLOYEE_ATTENDANCE_STORAGE_KEY) || '[]')).toHaveLength(2);
	});

	it('rejects duplicate employee and date records', async () => {
		await renderTracker();
		await addAttendance('Jordan Lee');
		await addAttendance(' jordan lee ');
		expect(container.textContent).toContain('already exists');
		expect(JSON.parse(localStorage.getItem(EMPLOYEE_ATTENDANCE_STORAGE_KEY) || '[]')).toHaveLength(1);
	});

	it('filters by month and deletes an attendance record', async () => {
		await renderTracker();
		await addAttendance();
		const currentMonth = container.querySelector<HTMLInputElement>('#attendance-month')?.value;
		if (!currentMonth) throw new Error('Missing default month');
		const [year, monthNumber] = currentMonth.split('-').map(Number);
		const previousMonthDate = new Date(year, monthNumber - 2, 1);
		const previousMonth = `${previousMonthDate.getFullYear()}-${String(previousMonthDate.getMonth() + 1).padStart(2, '0')}`;
		await act(async () => {
			const month = container.querySelector<HTMLInputElement>('#attendance-month');
			if (!month) throw new Error('Missing month filter');
			Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(month, previousMonth);
			month.dispatchEvent(new Event('input', { bubbles: true }));
			month.dispatchEvent(new Event('change', { bubbles: true }));
		});
		expect(container.textContent).toContain('No attendance records for this month');
		await act(async () => {
			const month = container.querySelector<HTMLInputElement>('#attendance-month');
			Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(month, currentMonth);
			month?.dispatchEvent(new Event('input', { bubbles: true }));
			month?.dispatchEvent(new Event('change', { bubbles: true }));
		});
		await act(async () => container.querySelector<HTMLButtonElement>('.expense-delete-button')?.click());
		expect(container.querySelector('.attendance-table')).toBeNull();
	});

	it('exports all entries as CSV', async () => {
		await renderTracker();
		await addAttendance();
		await act(async () => container.querySelector<HTMLButtonElement>('.expense-ledger-actions button')?.click());
		expect(triggerDownload).toHaveBeenCalledTimes(1);
		expect(triggerDownload.mock.calls[0]?.[1]).toMatch(/\.csv$/);
	});

	it('reports malformed saved browser data without overwriting it', async () => {
		localStorage.setItem(EMPLOYEE_ATTENDANCE_STORAGE_KEY, '{not json');
		await renderTracker();
		expect(container.textContent).toContain('Could not read saved attendance');
		expect(localStorage.getItem(EMPLOYEE_ATTENDANCE_STORAGE_KEY)).toBe('{not json');
	});
});
