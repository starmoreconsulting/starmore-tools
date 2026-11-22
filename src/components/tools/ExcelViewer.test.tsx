// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ExcelViewer from './ExcelViewer';

const { readWorkbook } = vi.hoisted(() => ({ readWorkbook: vi.fn() }));
vi.mock('read-excel-file/browser', () => ({ default: readWorkbook }));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
	readWorkbook.mockReset();
	container = document.createElement('div');
	document.body.append(container);
	root = createRoot(container);
	act(() => root.render(<ExcelViewer />));
});

afterEach(() => {
	act(() => root.unmount());
	container.remove();
});

describe('ExcelViewer', () => {
	it('renders a local XLSX upload control and states its limits', () => {
		expect(container.querySelector<HTMLInputElement>('#excel-viewer-file')?.accept).toContain('.xlsx');
		expect(container.textContent).toContain('Preview limits: 10 MB per file, 50 worksheets, 10,000 rows and 500 columns per worksheet.');
		expect(container.textContent).toContain('are not uploaded');
	});

	it('loads worksheets, displays cells, and switches worksheets', async () => {
		readWorkbook.mockResolvedValue([
			{ sheet: 'Overview', data: [['Name', 'Value'], ['Ada', 36]] },
			{ sheet: 'Notes', data: [['Summary'], ['Private worksheet']] },
		]);
		const input = container.querySelector<HTMLInputElement>('#excel-viewer-file')!;
		const file = new File(['workbook'], 'sample.xlsx');
		Object.defineProperty(input, 'files', { configurable: true, value: [file] });
		await act(async () => {
			input.dispatchEvent(new Event('change', { bubbles: true }));
			await new Promise((resolve) => setTimeout(resolve, 0));
		});

		expect(container.querySelector('table')?.textContent).toContain('Ada');
		expect(container.querySelector('table')?.textContent).toContain('36');
		expect(container.querySelector('[role="status"]')?.textContent).toContain('Loaded 2 worksheets.');

		const select = container.querySelector<HTMLSelectElement>('#excel-viewer-sheet')!;
		select.value = '1';
		await act(async () => {
			select.dispatchEvent(new Event('change', { bubbles: true }));
		});
		expect(container.querySelector('table')?.textContent).toContain('Private worksheet');
		expect(container.querySelector('table')?.textContent).not.toContain('Ada');
	});

	it('rejects a workbook above the file size limit without parsing it', async () => {
		const input = container.querySelector<HTMLInputElement>('#excel-viewer-file')!;
		const file = new File(['x'], 'large.xlsx');
		Object.defineProperty(file, 'size', { configurable: true, value: 10_000_001 });
		Object.defineProperty(input, 'files', { configurable: true, value: [file] });
		await act(async () => {
			input.dispatchEvent(new Event('change', { bubbles: true }));
		});
		expect(readWorkbook).not.toHaveBeenCalled();
		expect(container.textContent).toContain('Workbook is too large');
	});
});
