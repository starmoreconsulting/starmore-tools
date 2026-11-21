import { useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import { parsePageRanges, pdfErrorMessage, readPdf, triggerDownload } from '../../engines/pdf';

export default function PdfPageExtractor() {
	const [file, setFile] = useState<File | null>(null);
	const [ranges, setRanges] = useState('');
	const [busy, setBusy] = useState(false);
	const [message, setMessage] = useState('Choose a PDF and enter the pages you want to extract.');

	const extract = async () => {
		if (!file) { setMessage('Choose a PDF before extracting pages.'); return; }
		setBusy(true);
		try {
			const source = await readPdf(file);
			const pageIndexes = parsePageRanges(ranges, source.getPageCount());
			const output = await PDFDocument.create();
			const pages = await output.copyPages(source, pageIndexes);
			pages.forEach((page) => output.addPage(page));
			const bytes = await output.save();
			triggerDownload(new Blob([bytes], { type: 'application/pdf' }), file.name.replace(/\.pdf$/i, '') + '-extracted-pages.pdf');
			setMessage(`Extracted ${pageIndexes.length} selected page${pageIndexes.length === 1 ? '' : 's'} into one PDF.`);
		} catch (error) {
			setMessage(pdfErrorMessage(error));
		} finally {
			setBusy(false);
		}
	};

	return (
		<div>
			<div className="tool-control">
				<label htmlFor="pdf-extract-file">PDF file</label>
				<input className="image-file-input" id="pdf-extract-file" type="file" accept="application/pdf,.pdf" onChange={(event) => { setFile(event.currentTarget.files?.[0] ?? null); setRanges(''); setMessage('PDF selected. Enter the pages you want to extract.'); }} onInput={(event) => { setFile((event.currentTarget as HTMLInputElement).files?.[0] ?? null); setRanges(''); setMessage('PDF selected. Enter the pages you want to extract.'); }} />
			</div>
			<div className="calc-field">
				<label htmlFor="pdf-extract-ranges">Pages to extract (e.g. 1-3, 5, 8-10)</label>
				<input id="pdf-extract-ranges" type="text" value={ranges} onChange={(event) => setRanges(event.target.value)} onInput={(event) => setRanges(event.currentTarget.value)} placeholder="1-3, 5, 8-10" />
			</div>
			<div className="tool-actions">
				<button className="tool-button" type="button" disabled={!file || !ranges.trim() || busy} onClick={extract}>{busy ? 'Extracting pages…' : 'Extract and download PDF'}</button>
			</div>
			<p className="tool-message" role="status">{message}</p>
			<p className="privacy-note">Your PDF never leaves your device. Page extraction runs locally in this browser.</p>
		</div>
	);
}
