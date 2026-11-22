const MAX_CSV_LENGTH = 2_000_000;
const MAX_CSV_ROWS = 10_000;
const MAX_CSV_COLUMNS = 500;

export function parseCsvRows(source: string): string[][] {
	if (source.length > MAX_CSV_LENGTH) {
		throw new Error('CSV input is too large. Keep it under 2 MB of text.');
	}
	if (!source.trim()) {
		throw new Error('Enter CSV data with a header row.');
	}
	const csv = source.startsWith('\uFEFF') ? source.slice(1) : source;
	const rows: string[][] = [];
	let row: string[] = [];
	let field = '';
	let inQuotes = false;
	let quoteClosed = false;
	const pushField = () => {
		if (row.length >= MAX_CSV_COLUMNS) {
			throw new Error(`CSV has more than ${MAX_CSV_COLUMNS} columns, which is not supported.`);
		}
		row.push(field);
		field = '';
	};
	const pushRow = () => {
		pushField();
		if (rows.length >= MAX_CSV_ROWS) {
			throw new Error(`CSV has more than ${MAX_CSV_ROWS} rows, which is not supported.`);
		}
		rows.push(row);
		row = [];
	};

	for (let index = 0; index < csv.length; index += 1) {
		const character = csv[index];

		if (inQuotes) {
			if (character === '"') {
				if (csv[index + 1] === '"') {
					field += '"';
					index += 1;
				} else {
					inQuotes = false;
					quoteClosed = true;
				}
			} else if (character === '\r' && csv[index + 1] === '\n') {
				field += '\r\n';
				index += 1;
			} else {
				field += character;
			}
			continue;
		}

		if (character === ',') {
			pushField();
			quoteClosed = false;
			continue;
		}
		if (character === '\r' || character === '\n') {
			pushRow();
			quoteClosed = false;
			if (character === '\r' && csv[index + 1] === '\n') index += 1;
			continue;
		}
		if (character === '"' && field === '' && !quoteClosed) {
			inQuotes = true;
			continue;
		}
		if (character === '"' || quoteClosed) {
			throw new Error('Check the CSV quotes. Quotes inside a field must be doubled, and a quoted field must end before the next comma or line break.');
		}
		field += character;
	}

	if (inQuotes) throw new Error('A quoted field is not closed.');
	if (field !== '' || row.length > 0 || (csv.length > 0 && !/[\r\n]$/.test(csv))) {
		pushRow();
	}

	return rows.filter((record) => !(record.length === 1 && record[0].trim() === ''));
}

export function convertCsvToJson(source: string): string {
	const rows = parseCsvRows(source);
	const headers = rows[0]?.map((header) => header.trim());
	if (!headers?.length || headers.every((header) => !header)) {
		throw new Error('The first CSV row must contain column headers.');
	}
	if (headers.some((header) => !header)) {
		throw new Error('Every column must have a non-empty header.');
	}
	if (new Set(headers).size !== headers.length) {
		throw new Error('Column headers must be unique after trimming spaces.');
	}

	const records = rows.slice(1).map((cells, rowIndex) => {
		if (cells.length !== headers.length) {
			throw new Error(`Row ${rowIndex + 2} has ${cells.length} columns; the header has ${headers.length}.`);
		}
		return Object.fromEntries(headers.map((header, index) => [header, cells[index]]));
	});

	return JSON.stringify(records, null, 2);
}
