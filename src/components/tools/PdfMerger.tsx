import { useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import { pdfErrorMessage, readPdf, triggerDownload } from '../../engines/pdf';

function moveItem<T>(items: T[], index: number, direction: number): T[] {
	const destination = index + direction;
	if (destination < 0 || destination >= items.length) return items;
	const next = [...items];
	[next[index], next[destination]] = [next[destination], next[index]];
	return next;
}

export default function PdfMerger() {
	const [files, setFiles] = useState<File[]>([]);
	const [message, setMessage] = useState('Choose PDFs to combine. Files are processed locally on your device.');
	const [busy, setBusy] = useState(false);

	const addFiles = (selected: FileList | null) => {
		const incoming = Array.from(selected ?? []);
		const invalid = incoming.find((file) => file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf'));
		if (invalid) {
			setMessage(`${invalid.name} is not a PDF file.`);
			return;
		}
		setFiles([...files, ...incoming]);
		setMessage(incoming.length ? `${incoming.length} PDF${incoming.length === 1 ? '' : 's'} added.` : 'Choose at least two PDFs to merge.');
	};

	const merge = async () => {
		if (files.length < 2) {
			setMessage('Choose at least two PDF files to merge.');
			return;
		}
		setBusy(true);
		try {
			const merged = await PDFDocument.create();
			for (const file of files) {
				const source = await readPdf(file);
				if (source.getPageCount() === 0) throw new Error(`${file.name} contains no pages.`);
				const copiedPages = await merged.copyPages(source, source.getPageIndices());
				copiedPages.forEach((page) => merged.addPage(page));
			}
			const bytes = await merged.save();
			triggerDownload(new Blob([bytes], { type: 'application/pdf' }), 'starmore-merged.pdf');
			setMessage(`Merged ${files.length} PDFs into one file. Everything stayed on your device.`);
		} catch (error) {
			setMessage(pdfErrorMessage(error));
		} finally {
			setBusy(false);
		}
	};

	return (
		<div>
			<div className="tool-control">
				<label htmlFor="pdf-merge-files">PDF files (choose at least two)</label>
				<input className="image-file-input" id="pdf-merge-files" type="file" accept="application/pdf,.pdf" multiple onChange={(event) => addFiles(event.currentTarget.files)} />
			</div>
			<ul className="file-list">
				{files.map((file, index) => (
					<li className="file-list-item" key={`${file.name}-${file.lastModified}-${index}`}>
						<span className="file-list-name">{index + 1}. {file.name}</span>
						<button className="tool-button secondary" type="button" aria-label={`Move ${file.name} up`} disabled={index === 0 || busy} onClick={() => setFiles(moveItem(files, index, -1))}>↑</button>
						<button className="tool-button secondary" type="button" aria-label={`Move ${file.name} down`} disabled={index === files.length - 1 || busy} onClick={() => setFiles(moveItem(files, index, 1))}>↓</button>
						<button className="tool-button secondary" type="button" aria-label={`Remove ${file.name}`} disabled={busy} onClick={() => setFiles(files.filter((_, fileIndex) => fileIndex !== index))}>Remove</button>
					</li>
				))}
			</ul>
			<div className="tool-actions">
				<button className="tool-button" type="button" disabled={files.length < 2 || busy} onClick={merge}>{busy ? 'Merging PDFs…' : 'Merge and download'}</button>
			</div>
			<p className="tool-message" role="status">{message}</p>
			<p className="privacy-note">Your PDF files never leave your device. Merging runs locally in this browser.</p>
		</div>
	);
}
