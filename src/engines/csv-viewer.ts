import { parseCsvRows } from './csv-to-json';

export const CSV_VIEWER_PAGE_SIZE = 50;

export interface CsvTable {
	headers: string[];
	rows: string[][];
	irregularRows: number;
}

export function parseCsvTable(source: string): CsvTable {
	const parsedRows = parseCsvRows(source);
	const headers = parsedRows[0];
	if (!headers?.length) {
		throw new Error('The CSV must include a header row.');
	}

	const dataRows = parsedRows.slice(1);
	const columnCount = Math.max(headers.length, ...dataRows.map((row) => row.length));
	const normalizedHeaders = Array.from({ length: columnCount }, (_, index) => (
		headers[index]?.trim() || `Column ${index + 1}`
	));
	const irregularRows = dataRows.filter((row) => row.length !== headers.length).length;
	const rows = dataRows.map((row) => Array.from(
		{ length: columnCount },
		(_, index) => row[index] ?? '',
	));

	return { headers: normalizedHeaders, rows, irregularRows };
}
