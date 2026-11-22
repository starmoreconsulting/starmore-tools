import { describe, expect, it } from 'vitest';
import { CSV_VIEWER_PAGE_SIZE, parseCsvTable } from './csv-viewer';

describe('parseCsvTable', () => {
	it('parses CSV with quoted commas, quotes, and embedded newlines', () => {
		expect(parseCsvTable('name,note\nAda,"Hello, ""world"""\nLin,"line one\nline two"')).toEqual({
			headers: ['name', 'note'],
			rows: [
				['Ada', 'Hello, "world"'],
				['Lin', 'line one\nline two'],
			],
			irregularRows: 0,
		});
	});

	it('pads missing cells and labels extra columns without dropping data', () => {
		expect(parseCsvTable('name,age\nAda\nLin,28,Lagos')).toEqual({
			headers: ['name', 'age', 'Column 3'],
			rows: [
				['Ada', '', ''],
				['Lin', '28', 'Lagos'],
			],
			irregularRows: 2,
		});
	});

	it('supports duplicate or empty header cells in a readable table', () => {
		expect(parseCsvTable('name,name,\nAda,Grace,notes').headers).toEqual(['name', 'name', 'Column 3']);
	});

	it('returns table headings even when the file contains only a header row', () => {
		expect(parseCsvTable('id,name')).toMatchObject({
			headers: ['id', 'name'],
			rows: [],
			irregularRows: 0,
		});
	});

	it('rejects empty or malformed CSV using the shared parser errors', () => {
		expect(() => parseCsvTable('')).toThrow('Enter CSV data');
		expect(() => parseCsvTable('name,note\nAda,"open')).toThrow('not closed');
	});

	it('uses a bounded page size for large parsed tables', () => {
		expect(CSV_VIEWER_PAGE_SIZE).toBe(50);
	});

	it('rejects inputs that exceed the shared row or column limits', () => {
		expect(() => parseCsvTable(Array.from({ length: 10_001 }, () => 'value').join('\n'))).toThrow('more than 10000 rows');
		expect(() => parseCsvTable(Array.from({ length: 501 }, () => 'value').join(','))).toThrow('more than 500 columns');
	});
});
