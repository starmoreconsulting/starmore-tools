import { useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import { zipSync } from 'fflate';
import { parsePageGroups, pdfErrorMessage, readPdf, triggerDownload } from '../../engines/pdf';

export default function PdfSplitter() {
	const [file, setFile] = useState<File | null>(null);
	const [ranges, setRanges] = useState('');
	const [singlePages, setSinglePages] = useState(false);
	const [message, setMessage] = useState('Choose a PDF. Pages are split and zipped locally on your device.');
	const [busy, setBusy] = useState(false);

	const split = async () => {
		if (!file) {
			setMessage('Choose a PDF before splitting.');
			return;
		}
		setBusy(true);
		try {
			const source = await readPdf(file);
			const pageCount = source.getPageCount();
			if (pageCount === 0) throw new Error('This PDF contains no pages.');
			const groups = singlePages
				? Array.from({ length: pageCount }, (_, index) => [index])
				: parsePageGroups(ranges, pageCount);
			const outputs: Record<string, Uint8Array> = {};
			for (let index = 0; index < groups.length; index += 1) {
				const output = await PDFDocument.create();
				const pages = await output.copyPages(source, groups[index]);
				pages.forEach((page) => output.addPage(page));
				const name = singlePages
					? `page-${String(index + 1).padStart(3, '0')}.pdf`
					: `range-${index + 1}-pages-${groups[index].map((page) => page + 1).join('_')}.pdf`;
				outputs[name] = await output.save();
			}
			const archive = zipSync(outputs, { level: 6 });
			triggerDownload(new Blob([archive], { type: 'application/zip' }), 'starmore-split-pdfs.zip');
			setMessage(`Created ${groups.length} PDF${groups.length === 1 ? '' : 's'} in a ZIP file. Everything stayed on your device.`);
		} catch (error) {
			setMessage(pdfErrorMessage(error));
		} finally {
			setBusy(false);
		}
	};

	return (
		<div>
			<div className="tool-control">
				<label htmlFor="pdf-split-file">PDF file</label>
				<input className="image-file-input" id="pdf-split-file" type="file" accept="application/pdf,.pdf" onChange={(event) => { setFile(event.currentTarget.files?.[0] ?? null); setMessage('PDF selected. Choose pages to split.'); }} />
			</div>
			<div className="tool-choice-row" role="group" aria-label="Split mode">
				<label className="tool-choice">
					<input type="checkbox" checked={singlePages} onChange={(event) => setSinglePages(event.target.checked)} />
					<span>Split into individual pages</span>
				</label>
			</div>
			<div className="calc-field">
				<label htmlFor="pdf-split-ranges">Page ranges (e.g. 1-3, 5, 8-10)</label>
				<input id="pdf-split-ranges" type="text" value={ranges} disabled={singlePages} onChange={(event) => setRanges(event.target.value)} placeholder="1-3, 5, 8-10" />
			</div>
			<div className="tool-actions">
				<button className="tool-button" type="button" disabled={!file || busy} onClick={split}>{busy ? 'Splitting PDF…' : 'Split and download ZIP'}</button>
			</div>
			<p className="tool-message" role="status">{message}</p>
			<p className="privacy-note">Your PDF never leaves your device. Splitting and ZIP creation run locally in this browser.</p>
		</div>
	);
}
