import { useMemo, useState } from 'react';
import type { Sheet } from 'read-excel-file/browser';
import {
	EXCEL_VIEWER_MAX_COLUMNS,
	EXCEL_VIEWER_MAX_ROWS,
	EXCEL_VIEWER_PAGE_SIZE,
	EXCEL_VIEWER_VISIBLE_COLUMNS,
	formatExcelCell,
	getExcelColumnLabel,
	summarizeExcelSheet,
	type ExcelSheetSummary,
} from '../../engines/excel-viewer';

const MAX_FILE_BYTES = 10_000_000;

function getErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : 'Could not read this workbook.';
}

export default function ExcelViewer() {
	const [workbook, setWorkbook] = useState<Sheet[] | null>(null);
	const [summaries, setSummaries] = useState<ExcelSheetSummary[]>([]);
	const [sheetIndex, setSheetIndex] = useState(0);
	const [search, setSearch] = useState('');
	const [page, setPage] = useState(0);
	const [message, setMessage] = useState('Choose an .xlsx workbook to preview it locally.');
	const [isError, setIsError] = useState(false);
	const [busy, setBusy] = useState(false);

	const currentSheet = workbook?.[sheetIndex];
	const summary = summaries[sheetIndex];
	const filteredRows = useMemo(() => {
		if (!currentSheet) return [];
		const query = search.trim().toLocaleLowerCase();
		const rows = currentSheet.data;
		return query
			? rows.map((row, index) => ({ row, index })).filter(({ row }) => row.some((cell) => formatExcelCell(cell).toLocaleLowerCase().includes(query)))
			: rows.map((row, index) => ({ row, index }));
	}, [currentSheet, search]);
	const pageCount = Math.max(1, Math.ceil(filteredRows.length / EXCEL_VIEWER_PAGE_SIZE));
	const currentPage = Math.min(page, pageCount - 1);
	const visibleRows = filteredRows.slice(
		currentPage * EXCEL_VIEWER_PAGE_SIZE,
		(currentPage + 1) * EXCEL_VIEWER_PAGE_SIZE,
	);
	const columnCount = summary?.columnCount ?? 0;
	const visibleColumnCount = Math.min(columnCount, EXCEL_VIEWER_VISIBLE_COLUMNS);

	const loadWorkbook = async (file?: File) => {
		if (!file) return;
		setWorkbook(null);
		setSummaries([]);
		setSearch('');
		setPage(0);
		if (file.size > MAX_FILE_BYTES) {
			setMessage('Workbook is too large. Choose a file no larger than 10 MB.');
			setIsError(true);
			return;
		}

		setBusy(true);
		setMessage('Reading workbook…');
		setIsError(false);
		try {
			const { default: readXlsxFile } = await import('read-excel-file/browser');
			const nextWorkbook = await readXlsxFile(file, { trim: false });
			if (nextWorkbook.length === 0) throw new Error('This workbook does not contain any worksheets.');
			if (nextWorkbook.length > 50) throw new Error('This workbook has more than 50 worksheets, which is not supported.');
			const nextSummaries = nextWorkbook.map((sheet) => summarizeExcelSheet(sheet.data));
			setWorkbook(nextWorkbook);
			setSummaries(nextSummaries);
			setSheetIndex(0);
			const first = nextWorkbook[0];
			const firstSummary = nextSummaries[0];
			setMessage(`Loaded ${nextWorkbook.length} worksheet${nextWorkbook.length === 1 ? '' : 's'}. ${first.sheet}: ${firstSummary.rowCount.toLocaleString()} rows and ${firstSummary.columnCount} columns.`);
		} catch (error) {
			setMessage(getErrorMessage(error));
			setIsError(true);
		} finally {
			setBusy(false);
		}
	};

	const selectSheet = (index: number) => {
		setSheetIndex(index);
		setSearch('');
		setPage(0);
		const selected = workbook?.[index];
		const selectedSummary = summaries[index];
		if (selected && selectedSummary) {
			setMessage(`${selected.sheet}: ${selectedSummary.rowCount.toLocaleString()} rows and ${selectedSummary.columnCount} columns.`);
			setIsError(false);
		}
	};

	return (
		<div>
			<div className="calc-field">
				<label htmlFor="excel-viewer-file">Excel workbook (.xlsx, maximum 10 MB)</label>
				<input
					id="excel-viewer-file"
					type="file"
					accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
					onChange={(event) => void loadWorkbook(event.currentTarget.files?.[0])}
					disabled={busy}
				/>
			</div>
			{workbook && currentSheet && (
				<>
					<div className="calc-fields" style={{ marginTop: 16 }}>
						<div className="calc-field">
							<label htmlFor="excel-viewer-sheet">Worksheet</label>
							<select id="excel-viewer-sheet" value={sheetIndex} onChange={(event) => selectSheet(Number(event.target.value))}>
								{workbook.map((sheet, index) => <option key={`${sheet.sheet}-${index}`} value={index}>{sheet.sheet}</option>)}
							</select>
						</div>
						<div className="calc-field">
							<label htmlFor="excel-viewer-search">Filter rows</label>
							<input
								id="excel-viewer-search"
								type="search"
								value={search}
								onChange={(event) => { setSearch(event.target.value); setPage(0); }}
								placeholder="Search across all cells"
							/>
						</div>
					</div>
					<p className="tool-message" aria-live="polite">
						Showing {filteredRows.length === 0 ? 0 : currentPage * EXCEL_VIEWER_PAGE_SIZE + 1}
						–{Math.min((currentPage + 1) * EXCEL_VIEWER_PAGE_SIZE, filteredRows.length)}
						{' '}of {filteredRows.length.toLocaleString()} matching rows in {currentSheet.sheet}.
					</p>
					<div style={{ overflowX: 'auto', maxWidth: '100%' }}>
						<table className="excel-viewer-table">
							<thead>
								<tr>
									<th scope="col">Row</th>
									{Array.from({ length: visibleColumnCount }, (_, index) => <th key={index} scope="col">{getExcelColumnLabel(index)}</th>)}
								</tr>
							</thead>
							<tbody>
								{visibleRows.map(({ row, index }, rowIndex) => {
									return (
										<tr key={`${currentPage}-${rowIndex}`}>
											<th scope="row">{index + 1}</th>
											{Array.from({ length: visibleColumnCount }, (_, columnIndex) => (
												<td key={columnIndex}>{formatExcelCell(row[columnIndex])}</td>
											))}
										</tr>
									);
								})}
								{visibleRows.length === 0 && <tr><td colSpan={visibleColumnCount + 1}>No matching rows.</td></tr>}
							</tbody>
						</table>
					</div>
					{columnCount > EXCEL_VIEWER_VISIBLE_COLUMNS && <p className="tool-message">Showing the first {EXCEL_VIEWER_VISIBLE_COLUMNS} of {columnCount} columns in the preview.</p>}
					{pageCount > 1 && (
						<nav className="tool-actions" aria-label="Worksheet preview pages">
							<button className="tool-button secondary" type="button" onClick={() => setPage(currentPage - 1)} disabled={currentPage === 0}>Previous</button>
							<span>Page {currentPage + 1} of {pageCount}</span>
							<button className="tool-button secondary" type="button" onClick={() => setPage(currentPage + 1)} disabled={currentPage >= pageCount - 1}>Next</button>
						</nav>
					)}
				</>
			)}
			<p className={`tool-message${isError ? ' error' : ''}`} role="status">{busy ? 'Reading workbook…' : message}</p>
			<p className="tool-message">XLSX files are parsed in your browser and are not uploaded. Legacy .xls files are not supported.</p>
			<p className="tool-message">Preview limits: 10 MB per file, 50 worksheets, {EXCEL_VIEWER_MAX_ROWS.toLocaleString()} rows and {EXCEL_VIEWER_MAX_COLUMNS} columns per worksheet.</p>
		</div>
	);
}
