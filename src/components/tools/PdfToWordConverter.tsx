import { useState } from 'react';
import { triggerDownload } from '../../engines/pdf';
import { normalizeExtractedPageText, summarizePdfWordConversion } from '../../engines/pdf-to-word';

export default function PdfToWordConverter() {
	const [file, setFile] = useState<File | null>(null);
	const [busy, setBusy] = useState(false);
	const [message, setMessage] = useState('Choose a PDF to extract text and create a local DOCX document.');

	const convert = async () => {
		if (!file) { setMessage('Choose a PDF before converting.'); return; }
		setBusy(true);
		setMessage('Loading the local PDF text extractor…');
		try {
			const [{ openPdf }, docx] = await Promise.all([
				import('clawpdf/browser'),
				import('docx'),
			]);
			const pdf = await openPdf(new Uint8Array(await file.arrayBuffer()));
			try {
				const children: any[] = [];
				let extractedLines = 0;
				for (let pageNumber = 1; pageNumber <= pdf.pageCount; pageNumber += 1) {
					setMessage(`Extracting page ${pageNumber} of ${pdf.pageCount}…`);
					const lines = normalizeExtractedPageText(pdf.page(pageNumber).text());
					extractedLines += lines.length;
					if (pageNumber > 1) children.push(new docx.Paragraph({ children: [new docx.PageBreak()] }));
					children.push(new docx.Paragraph({ children: [new docx.TextRun({ text: `Page ${pageNumber}`, bold: true, size: 28 })] }));
					if (lines.length === 0) {
						children.push(new docx.Paragraph({ children: [new docx.TextRun({ text: '[No selectable text detected on this page]', italics: true, color: '777777' })] }));
					} else {
						for (const line of lines) children.push(new docx.Paragraph({ children: [new docx.TextRun(line)] }));
					}
				}
				const summary = summarizePdfWordConversion(pdf.pageCount, extractedLines);
				const document = new docx.Document({
					sections: [{ properties: {}, children }],
				});
				const blob = await docx.Packer.toBlob(document);
				triggerDownload(blob, file.name.replace(/\.pdf$/i, '') + '.docx');
				setMessage(summary.imageOnlyLikely
					? 'Created a DOCX, but this PDF appears image-only or has no selectable text. OCR is required for its content.'
					: `Created a DOCX from ${summary.pageCount} page${summary.pageCount === 1 ? '' : 's'} with ${summary.extractedLines} extracted text line${summary.extractedLines === 1 ? '' : 's'}.`);
			} finally {
				pdf.destroy();
			}
		} catch (error) {
			setMessage(error instanceof Error ? `Could not convert this PDF. ${error.message}` : 'Could not convert this PDF. It may be damaged or password-protected.');
		} finally {
			setBusy(false);
		}
	};

	return (
		<div>
			<div className="tool-control">
				<label htmlFor="pdf-word-file">PDF file</label>
				<input className="image-file-input" id="pdf-word-file" type="file" accept="application/pdf,.pdf" onChange={(event) => { setFile(event.target.files?.[0] ?? null); setMessage(event.target.files?.[0] ? 'PDF selected. Ready to extract text.' : 'Choose a PDF file.'); }} />
			</div>
			<div className="tool-actions"><button className="tool-button" type="button" disabled={!file || busy} onClick={() => void convert()}>{busy ? 'Creating DOCX…' : 'Convert to DOCX'}</button></div>
			<p className="tool-message" role="status">{message}</p>
			<p className="privacy-note">Text extraction and DOCX creation run locally in this browser. Scanned, image-only PDFs may need OCR.</p>
		</div>
	);
}
