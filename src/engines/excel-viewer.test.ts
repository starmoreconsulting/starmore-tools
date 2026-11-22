import { describe, expect, it } from 'vitest';
import { EXCEL_VIEWER_MAX_COLUMNS, EXCEL_VIEWER_MAX_ROWS, formatExcelCell, getExcelColumnLabel, summarizeExcelSheet } from './excel-viewer';

describe('Excel viewer helpers', () => {
	it('summarizes worksheet dimensions without treating the first row as headers', () => {
		expect(summarizeExcelSheet([
			['Name', 'Age'],
			['Ada', 36],
			['Lin', null, 'extra'],
		])).toEqual({ rowCount: 3, columnCount: 3 });
	});

	it('rejects worksheets beyond row and column limits', () => {
		expect(() => summarizeExcelSheet(Array.from({ length: EXCEL_VIEWER_MAX_ROWS + 1 }, () => []))).toThrow('more than 10,000 rows');
		expect(() => summarizeExcelSheet([Array.from({ length: EXCEL_VIEWER_MAX_COLUMNS + 1 }, () => null)])).toThrow('more than 500 columns');
	});

	it('labels columns with spreadsheet letters', () => {
		expect([0, 25, 26, 51, 52, 701, 702].map(getExcelColumnLabel)).toEqual(['A', 'Z', 'AA', 'AZ', 'BA', 'ZZ', 'AAA']);
		expect(() => getExcelColumnLabel(-1)).toThrow('non-negative');
	});

	it('formats common spreadsheet cell values consistently', () => {
		expect(formatExcelCell(null)).toBe('');
		expect(formatExcelCell(false)).toBe('false');
		expect(formatExcelCell(42)).toBe('42');
		expect(formatExcelCell(new Date('2024-01-02T03:04:05.000Z'))).toBe('2024-01-02T03:04:05.000Z');
	});
});
