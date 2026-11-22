import { useState } from 'react';
import { jsPDF } from 'jspdf';
import type { Sheet } from 'read-excel-file/browser';
import { triggerDownload } from '../../engines/pdf';
import { cellValueText, compactSheetName, type ExcelPreviewSheet } from '../../engines/excel-to-pdf';

type ExcelWorkbook = Sheet[];

function createSheetPreview(sheet: Sheet): ExcelPreviewSheet {
	const columnCount = sheet.data.reduce((max, row) => Math.max(max, row.length), 0);
	return {
		name: sheet.sheet,
		rowCount: sheet.data.length,
		columnCount,
		rows: sheet.data.slice(0, 8).map((row) => ({ cells: row.slice(0, 8).map(cellValueText) })),
	};
}

export default function ExcelToPdfConverter() {
	const [file, setFile] = useState<File | null>(null);
	const [sheetName, setSheetName] = useState('');
	const [sheetNames, setSheetNames] = useState<string[]>([]);
	const [preview, setPreview] = useState<ExcelPreviewSheet | null>(null);
	const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('landscape');
	const [pageSize, setPageSize] = useState<'a4' | 'letter'>('a4');
	const [busy, setBusy] = useState(false);
	const [workbook, setWorkbook] = useState<ExcelWorkbook | null>(null);
	const [resultBlob, setResultBlob] = useState<Blob | null>(null);
	const [downloadName, setDownloadName] = useState('');
	const [message, setMessage] = useState('Choose an XLSX workbook to preview and convert locally.');

	const loadWorkbook = async (selected: File) => {
		setFile(selected);
		setPreview(null);
		setResultBlob(null);
		setDownloadName('');
		setSheetNames([]);
		setSheetName('');
		setBusy(true);
		setMessage('Reading workbook sheets…');
		try {
			const { default: readXlsxFile } = await import('read-excel-file/browser');
			const nextWorkbook = await readXlsxFile(selected, { trim: false });
			setWorkbook(nextWorkbook);
			const names = nextWorkbook.map((worksheet) => worksheet.sheet);
			if (!names.length) throw new Error('This workbook has no worksheets.');
			setSheetNames(names);
			setSheetName(names[0]);
			const worksheet = nextWorkbook.find((sheet) => sheet.sheet === names[0]);
			if (!worksheet) throw new Error('Could not read the first worksheet.');
			const sheetPreview = createSheetPreview(worksheet);
			setPreview(sheetPreview);
			setMessage(`Workbook ready: ${names.length} worksheet${names.length === 1 ? '' : 's'}, ${sheetPreview.rowCount} rows, ${sheetPreview.columnCount} columns.`);
		} catch (error) {
			setMessage(error instanceof Error ? `Could not read this workbook. ${error.message}` : 'Could not read this workbook.');
		} finally {
			setBusy(false);
		}
	};

	const selectWorksheet = (name: string) => {
		setSheetName(name);
		if (!workbook) return;
		const worksheet = workbook.find((sheet) => sheet.sheet === name);
		if (!worksheet) return;
		setPreview(createSheetPreview(worksheet));
	};

	const convert = async () => {
		if (!file) { setMessage('Choose an XLSX workbook before converting.'); return; }
		setBusy(true);
		setMessage('Creating the PDF…');
		try {
			if (!workbook) throw new Error('Load a workbook first.');
			const worksheet = workbook.find((sheet) => sheet.sheet === sheetName);
			if (!worksheet) throw new Error('Select a valid worksheet.');
			const pdf = new jsPDF({ orientation, unit: 'pt', format: pageSize });
			const margin = 36;
			const pageWidth = pdf.internal.pageSize.getWidth();
			const pageHeight = pdf.internal.pageSize.getHeight();
			const contentWidth = pageWidth - margin * 2;
			let y = margin;
			pdf.setFont('helvetica', 'bold');
			pdf.setFontSize(14);
			pdf.text(compactSheetName(worksheet.sheet), margin, y);
			y += 28;
			pdf.setFont('helvetica', 'normal');
			pdf.setFontSize(8);

			const columnCount = Math.max(1, worksheet.data.reduce((max, row) => Math.max(max, row.length), 0));
			const cellWidth = contentWidth / Math.min(columnCount, 12);
			const rows = worksheet.data.filter((row) => row.some((value) => value !== null && value !== undefined && value !== ''));
			const maxRows = rows.length;
			let renderedRows = 0;
			for (const row of rows.slice(0, 200)) {
				if (y + 22 > pageHeight - margin) {
					pdf.addPage();
					y = margin;
				}
				const values: string[] = [];
				for (let column = 1; column <= Math.min(columnCount, 12); column += 1) {
					values.push(cellValueText(row[column - 1]));
				}
				values.forEach((value, index) => {
					const lines = pdf.splitTextToSize(value, Math.max(20, cellWidth - 6)) as string[];
					pdf.rect(margin + index * cellWidth, y - 8, cellWidth, 20);
					pdf.text(lines.slice(0, 1), margin + index * cellWidth + 3, y + 4);
				});
				y += 22;
				renderedRows += 1;
			}
			if (maxRows > renderedRows) {
				if (y + 22 > pageHeight - margin) {
					pdf.addPage();
					y = margin;
				}
				pdf.setFont('helvetica', 'italic');
				pdf.text(`Preview limit: ${renderedRows} of ${maxRows} rows exported.`, margin, y);
			}
			const blob = pdf.output('blob');
			const name = `${compactSheetName(file.name.replace(/\.xlsx$/i, ''))}-${compactSheetName(worksheet.sheet)}.pdf`;
			setResultBlob(blob);
			setDownloadName(name);
			setMessage(`Created a PDF from ${worksheet.sheet}. ${renderedRows} row${renderedRows === 1 ? '' : 's'} rendered, with a preview limit of 200 rows.`);
		} catch (error) {
			setMessage(error instanceof Error ? `Could not convert this workbook. ${error.message}` : 'Could not convert this workbook.');
		} finally {
			setBusy(false);
		}
	};

	return (
		<div>
			<div className="tool-control">
				<label htmlFor="excel-pdf-file">Excel workbook (.xlsx)</label>
				<input className="image-file-input" id="excel-pdf-file" type="file" accept="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.xlsx" onChange={(event) => { const selected = event.target.files?.[0]; if (selected) void loadWorkbook(selected); }} />
			</div>
			{sheetNames.length > 0 && <div className="calc-fields">
				<div className="calc-field"><label htmlFor="excel-pdf-sheet">Worksheet</label><select id="excel-pdf-sheet" value={sheetName} onChange={(event) => selectWorksheet(event.target.value)}>{sheetNames.map((name) => <option key={name} value={name}>{name}</option>)}</select></div>
				<div className="calc-field"><label htmlFor="excel-pdf-size">Page size</label><select id="excel-pdf-size" value={pageSize} onChange={(event) => setPageSize(event.target.value as 'a4' | 'letter')}><option value="a4">A4</option><option value="letter">Letter</option></select></div>
				<div className="calc-field"><label htmlFor="excel-pdf-orientation">Orientation</label><select id="excel-pdf-orientation" value={orientation} onChange={(event) => setOrientation(event.target.value as 'portrait' | 'landscape')}><option value="portrait">Portrait</option><option value="landscape">Landscape</option></select></div>
			</div>}
			{preview && <div className="excel-preview"><div className="stats-row"><span><strong>{preview.rowCount}</strong> rows</span><span><strong>{preview.columnCount}</strong> columns</span><span><strong>{preview.name}</strong> worksheet</span></div><div className="excel-preview-grid">{preview.rows.map((row, rowIndex) => <div className="excel-preview-row" key={rowIndex}>{row.cells.map((cell, cellIndex) => <span key={cellIndex}>{cell}</span>)}</div>)}</div></div>}
			<div className="tool-actions">
				<button className="tool-button" type="button" disabled={!file || !sheetName || busy} onClick={() => void convert()}>{busy ? 'Creating PDF…' : 'Convert worksheet to PDF'}</button>
				{resultBlob && <button className="tool-button secondary" type="button" onClick={() => triggerDownload(resultBlob, downloadName)}>Download PDF</button>}
			</div>
			<p className="tool-message" role="status">{message}</p>
			<p className="privacy-note">Workbook parsing and PDF generation run locally in this browser. XLS legacy files are not supported; use a .xlsx export.</p>
		</div>
	);
}
