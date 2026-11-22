import type { SheetData } from 'read-excel-file/browser';

export const EXCEL_VIEWER_PAGE_SIZE = 50;
export const EXCEL_VIEWER_MAX_ROWS = 10_000;
export const EXCEL_VIEWER_MAX_COLUMNS = 500;
export const EXCEL_VIEWER_VISIBLE_COLUMNS = 30;

export interface ExcelSheetSummary {
	rowCount: number;
	columnCount: number;
}

export function summarizeExcelSheet(data: SheetData): ExcelSheetSummary {
	const rowCount = data.length;
	if (rowCount > EXCEL_VIEWER_MAX_ROWS) {
		throw new Error(`This worksheet has more than ${EXCEL_VIEWER_MAX_ROWS.toLocaleString()} rows, which is not supported.`);
	}

	const columnCount = data.reduce((max, row) => Math.max(max, row.length), 0);
	if (columnCount > EXCEL_VIEWER_MAX_COLUMNS) {
		throw new Error(`This worksheet has more than ${EXCEL_VIEWER_MAX_COLUMNS} columns, which is not supported.`);
	}

	return { rowCount, columnCount };
}

export function getExcelColumnLabel(index: number): string {
	if (!Number.isInteger(index) || index < 0) {
		throw new Error('Column index must be a non-negative whole number.');
	}
	let label = '';
	let value = index + 1;
	while (value > 0) {
		value -= 1;
		label = String.fromCharCode(65 + (value % 26)) + label;
		value = Math.floor(value / 26);
	}
	return label;
}

export function formatExcelCell(value: SheetData[number][number]): string {
	if (value === null || value === undefined) return '';
	if (value instanceof Date) return Number.isNaN(value.getTime()) ? '' : value.toISOString();
	return String(value);
}
