import { useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import { parseReorderedPages } from '../../engines/pdf-rearrange';
import { pdfErrorMessage, readPdf, triggerDownload } from '../../engines/pdf';

export default function PdfPageRearranger() {
	const [file, setFile] = useState<File | null>(null);
	const [order, setOrder] = useState('');
	const [busy, setBusy] = useState(false);
	const [message, setMessage] = useState('Choose a PDF and enter the desired page order.');

	const rearrange = async () => {
		if (!file) { setMessage('Choose a PDF before rearranging pages.'); return; }
		setBusy(true);
		try {
			const source = await readPdf(file);
			const pageIndexes = parseReorderedPages(order, source.getPageCount());
			const output = await PDFDocument.create();
			const pages = await output.copyPages(source, pageIndexes);
			pages.forEach((page) => output.addPage(page));
			const bytes = await output.save();
			triggerDownload(new Blob([bytes], { type: 'application/pdf' }), file.name.replace(/\.pdf$/i, '') + '-rearranged.pdf');
			setMessage(`Rearranged ${pageIndexes.length} of ${source.getPageCount()} pages into the requested order.`);
		} catch (error) {
			setMessage(pdfErrorMessage(error));
		} finally {
			setBusy(false);
		}
	};

	return (
		<div>
			<div className="tool-control">
				<label htmlFor="pdf-rearrange-file">PDF file</label>
				<input className="image-file-input" id="pdf-rearrange-file" type="file" accept="application/pdf,.pdf" onChange={(event) => { setFile(event.currentTarget.files?.[0] ?? null); setOrder(''); setMessage('PDF selected. Enter the new page order.'); }} onInput={(event) => { setFile((event.currentTarget as HTMLInputElement).files?.[0] ?? null); setOrder(''); setMessage('PDF selected. Enter the new page order.'); }} />
			</div>
			<div className="calc-field">
				<label htmlFor="pdf-rearrange-order">New page order (e.g. 3, 1, 2, 4)</label>
				<input id="pdf-rearrange-order" type="text" value={order} onChange={(event) => setOrder(event.target.value)} onInput={(event) => setOrder(event.currentTarget.value)} placeholder="3, 1, 2, 4" />
			</div>
			<p className="privacy-note">Only the page numbers you list are included. Use 1 for the first PDF page.</p>
			<div className="tool-actions">
				<button className="tool-button" type="button" disabled={!file || !order.trim() || busy} onClick={rearrange}>{busy ? 'Rearranging pages…' : 'Rearrange and download PDF'}</button>
			</div>
			<p className="tool-message" role="status">{message}</p>
			<p className="privacy-note">Your PDF never leaves your device. Reordering runs locally in this browser.</p>
		</div>
	);
}
