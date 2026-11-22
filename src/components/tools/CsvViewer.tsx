import { useMemo, useState } from 'react';
import { CSV_VIEWER_PAGE_SIZE, parseCsvTable, type CsvTable } from '../../engines/csv-viewer';

const MAX_FILE_BYTES = 2_000_000;

function getErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : 'Could not read this CSV.';
}

export default function CsvViewer() {
	const [csv, setCsv] = useState('');
	const [table, setTable] = useState<CsvTable | null>(null);
	const [search, setSearch] = useState('');
	const [page, setPage] = useState(0);
	const [message, setMessage] = useState('Choose a CSV file or paste CSV text to preview it locally.');
	const [isError, setIsError] = useState(false);

	const filteredRows = useMemo(() => {
		if (!table) return [];
		const query = search.trim().toLocaleLowerCase();
		return query
			? table.rows.filter((row) => row.some((cell) => cell.toLocaleLowerCase().includes(query)))
			: table.rows;
	}, [search, table]);
	const pageCount = Math.max(1, Math.ceil(filteredRows.length / CSV_VIEWER_PAGE_SIZE));
	const currentPage = Math.min(page, pageCount - 1);
	const visibleRows = filteredRows.slice(
		currentPage * CSV_VIEWER_PAGE_SIZE,
		(currentPage + 1) * CSV_VIEWER_PAGE_SIZE,
	);

	const invalidate = (nextCsv: string) => {
		setCsv(nextCsv);
		setTable(null);
		setSearch('');
		setPage(0);
		setMessage('');
		setIsError(false);
	};

	const loadCsv = (source = csv) => {
		try {
			const parsed = parseCsvTable(source);
			setTable(parsed);
			setSearch('');
			setPage(0);
			setMessage(
				`Loaded ${parsed.rows.length.toLocaleString()} data row${parsed.rows.length === 1 ? '' : 's'} and ${parsed.headers.length.toLocaleString()} column${parsed.headers.length === 1 ? '' : 's'}.`
				+ (parsed.irregularRows ? ` ${parsed.irregularRows.toLocaleString()} row${parsed.irregularRows === 1 ? '' : 's'} had a different number of values than the header; the table preserves their contents.` : ''),
			);
			setIsError(false);
		} catch (error) {
			setTable(null);
			setMessage(getErrorMessage(error));
			setIsError(true);
		}
	};

	const readFile = async (file?: File) => {
		if (!file) return;
		if (file.size > MAX_FILE_BYTES) {
			invalidate('');
			setTable(null);
			setMessage('CSV file is too large. Choose a file no larger than 2 MB.');
			setIsError(true);
			return;
		}
		try {
			const contents = await file.text();
			invalidate(contents);
			loadCsv(contents);
		} catch (error) {
			invalidate('');
			setTable(null);
			setMessage(getErrorMessage(error));
			setIsError(true);
		}
	};

	return (
		<div>
			<div className="calc-field">
				<label htmlFor="csv-viewer-file">Choose a CSV file (maximum 2 MB)</label>
				<input
					id="csv-viewer-file"
					type="file"
					accept=".csv,text/csv"
					onChange={(event) => void readFile(event.currentTarget.files?.[0])}
				/>
			</div>
			<div className="calc-field" style={{ marginTop: 16 }}>
				<label htmlFor="csv-viewer-input">Or paste CSV text</label>
				<textarea
					id="csv-viewer-input"
					value={csv}
					onChange={(event) => invalidate(event.target.value)}
					placeholder={'name,age\nAda,36'}
					spellCheck={false}
				/>
			</div>
			<div className="tool-actions">
				<button className="tool-button" type="button" onClick={() => loadCsv()} disabled={!csv.trim()}>Preview CSV</button>
				<button
					className="tool-button secondary"
					type="button"
					onClick={() => { invalidate(''); setMessage('Choose a CSV file or paste CSV text to preview it locally.'); }}
					disabled={!csv && !table}
				>
					Clear
				</button>
			</div>
			{table && (
				<section aria-label="CSV table preview">
					{table.rows.length > 0 && (
						<div className="calc-field" style={{ marginTop: 16 }}>
							<label htmlFor="csv-viewer-search">Filter rows</label>
							<input
								id="csv-viewer-search"
								type="search"
								value={search}
								onChange={(event) => { setSearch(event.target.value); setPage(0); }}
								placeholder="Search across all columns"
							/>
						</div>
					)}
					<p className="tool-message" role="status">
						Showing {filteredRows.length === 0 ? 0 : currentPage * CSV_VIEWER_PAGE_SIZE + 1}
						–{Math.min((currentPage + 1) * CSV_VIEWER_PAGE_SIZE, filteredRows.length)}
						{' '}of {filteredRows.length.toLocaleString()} matching rows.
					</p>
					<div style={{ overflowX: 'auto', maxWidth: '100%' }}>
						<table>
							<thead>
								<tr>{table.headers.map((header, index) => <th key={`${header}-${index}`} scope="col">{header}</th>)}</tr>
							</thead>
							<tbody>
								{visibleRows.map((row, rowIndex) => (
									<tr key={`${currentPage}-${rowIndex}`}>
										{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}
									</tr>
								))}
								{visibleRows.length === 0 && (
									<tr><td colSpan={table.headers.length}>No matching rows.</td></tr>
								)}
							</tbody>
						</table>
					</div>
					{pageCount > 1 && (
						<nav className="tool-actions" aria-label="CSV preview pages">
							<button className="tool-button secondary" type="button" onClick={() => setPage(currentPage - 1)} disabled={currentPage === 0}>Previous</button>
							<span>Page {currentPage + 1} of {pageCount}</span>
							<button className="tool-button secondary" type="button" onClick={() => setPage(currentPage + 1)} disabled={currentPage >= pageCount - 1}>Next</button>
						</nav>
					)}
				</section>
			)}
			<p className={`tool-message${isError ? ' error' : ''}`} role="status">{message}</p>
			<p className="tool-message">The first row is treated as column headings. CSV parsing happens locally; files and pasted data are not uploaded.</p>
		</div>
	);
}
