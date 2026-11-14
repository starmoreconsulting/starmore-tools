import { useState } from 'react';
import { degrees } from 'pdf-lib';
import { parsePageRanges, pdfErrorMessage, readPdf, triggerDownload } from '../../engines/pdf';

type Rotation = 90 | 180 | 270;

export default function PdfPageRotator() {
	const [file, setFile] = useState<File | null>(null);
	const [allPages, setAllPages] = useState(true);
	const [pagesInput, setPagesInput] = useState('');
	const [rotation, setRotation] = useState<Rotation>(90);
	const [message, setMessage] = useState('Choose a PDF. Rotation runs locally on your device.');
	const [busy, setBusy] = useState(false);

	const rotate = async () => {
		if (!file) {
			setMessage('Choose a PDF before rotating pages.');
			return;
		}
		setBusy(true);
		try {
			const pdf = await readPdf(file);
			const pages = pdf.getPages();
			if (!pages.length) throw new Error('This PDF contains no pages.');
			const indexes = allPages ? pages.map((_, index) => index) : parsePageRanges(pagesInput, pages.length);
			for (const index of indexes) {
				const page = pages[index];
				const current = ((page.getRotation().angle % 360) + 360) % 360;
				page.setRotation(degrees((current + rotation) % 360));
			}
			const bytes = await pdf.save();
			triggerDownload(new Blob([bytes], { type: 'application/pdf' }), 'starmore-rotated.pdf');
			setMessage(`Rotated ${indexes.length} page${indexes.length === 1 ? '' : 's'} by ${rotation}°. The updated PDF is on your device.`);
		} catch (error) {
			setMessage(pdfErrorMessage(error));
		} finally {
			setBusy(false);
		}
	};

	return (
		<div>
			<div className="tool-control">
				<label htmlFor="pdf-rotate-file">PDF file</label>
				<input className="image-file-input" id="pdf-rotate-file" type="file" accept="application/pdf,.pdf" onChange={(event) => { setFile(event.currentTarget.files?.[0] ?? null); setMessage('PDF selected. Choose rotation options.'); }} />
			</div>
			<div className="tool-choice-row">
				<label className="tool-choice">
					<input type="checkbox" checked={allPages} onChange={(event) => setAllPages(event.target.checked)} />
					<span>Rotate all pages</span>
				</label>
			</div>
			<div className="calc-fields">
				<div className="calc-field">
					<label htmlFor="pdf-rotate-degrees">Rotation</label>
					<select id="pdf-rotate-degrees" value={rotation} onChange={(event) => setRotation(Number(event.target.value) as Rotation)}>
						<option value="90">90° clockwise</option>
						<option value="180">180°</option>
						<option value="270">270° clockwise</option>
					</select>
				</div>
				<div className="calc-field">
					<label htmlFor="pdf-rotate-pages">Selected pages (e.g. 1-3, 5)</label>
					<input id="pdf-rotate-pages" type="text" value={pagesInput} disabled={allPages} onChange={(event) => setPagesInput(event.target.value)} placeholder="1-3, 5" />
				</div>
			</div>
			<div className="tool-actions">
				<button className="tool-button" type="button" disabled={!file || busy} onClick={rotate}>{busy ? 'Rotating PDF…' : 'Rotate and download'}</button>
			</div>
			<p className="tool-message" role="status">{message}</p>
			<p className="privacy-note">Your PDF never leaves your device. Page rotation runs locally in this browser.</p>
		</div>
	);
}
