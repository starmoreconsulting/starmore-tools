const MAX_JSON_LENGTH = 2_000_000;
const FORMULA_PREFIX = /^[\t\r ]*[=+\-@]/;

export interface JsonToCsvResult {
	csv: string;
	records: number;
	columns: number;
	protectedCells: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toCell(value: unknown): string {
	if (value === null || value === undefined) return '';
	if (typeof value === 'string') return value;
	if (typeof value === 'number' || typeof value === 'boolean') return String(value);
	return JSON.stringify(value);
}

function quoteCsvCell(value: string): string {
	return `"${value.replace(/"/g, '""')}"`;
}

export function convertJsonToCsv(source: string, protectFormulas = true): JsonToCsvResult {
	if (source.length > MAX_JSON_LENGTH) {
		throw new Error('JSON input is too large. Keep it under 2 MB of text.');
	}
	if (!source.trim()) {
		throw new Error('Enter a JSON array containing object records.');
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(source);
	} catch (error) {
		throw new Error(`Invalid JSON: ${error instanceof Error ? error.message : 'Check the JSON syntax.'}`);
	}
	if (!Array.isArray(parsed) || parsed.length === 0 || !parsed.every(isRecord)) {
		throw new Error('Enter a non-empty JSON array where every item is an object.');
	}

	const headers: string[] = [];
	const headerSet = new Set<string>();
	for (const record of parsed) {
		for (const key of Object.keys(record)) {
			if (!headerSet.has(key)) {
				headerSet.add(key);
				headers.push(key);
			}
		}
	}
	if (headers.length === 0) {
		throw new Error('Add at least one property to the JSON records before converting.');
	}

	let protectedCells = 0;
	const formatCell = (value: string): string => {
		const needsProtection = protectFormulas && FORMULA_PREFIX.test(value);
		if (needsProtection) protectedCells += 1;
		return quoteCsvCell(needsProtection ? `'${value}` : value);
	};
	const rows = [
		headers.map(formatCell).join(','),
		...parsed.map((record) => headers
			.map((header) => formatCell(Object.hasOwn(record, header) ? toCell(record[header]) : ''))
			.join(',')),
	];

	return {
		csv: rows.join('\r\n'),
		records: parsed.length,
		columns: headers.length,
		protectedCells,
	};
}
