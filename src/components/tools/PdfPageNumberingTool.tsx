import { useState } from 'react';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { readPdf, triggerDownload, parsePageRanges, pdfErrorMessage } from '../../engines/pdf';
import { formatPageNumber, normalizePageNumberOptions, type PageNumberFormat, type PageNumberPosition } from '../../engines/pdf-page-numbering';

export default function PdfPageNumberingTool() {
	const [file, setFile] = useState<File | null>(null);
	const [ranges, setRanges] = useState('');
	const [allPages, setAllPages] = useState(true);
	const [position, setPosition] = useState<PageNumberPosition>('bottom-center');
	const [format, setFormat] = useState<PageNumberFormat>('page-number');
	const [startNumber, setStartNumber] = useState(1);
	const [size, setSize] = useState(10);
	const [busy, setBusy] = useState(false);
	const [message, setMessage] = useState('Choose a PDF and configure the page number style.');

	const numberPages = async () => {
		if (!file) { setMessage('Choose a PDF before adding page numbers.'); return; }
		let options;
		try { options = normalizePageNumberOptions(startNumber, size); } catch (error) { setMessage(error instanceof Error ? error.message : 'Invalid page-number options.'); return; }
		setBusy(true);
		setMessage('Adding page numbers…');
		try {
			const source = await readPdf(file);
			const totalPages = source.getPageCount();
			const selectedIndexes = allPages ? Array.from({ length: totalPages }, (_, index) => index) : parsePageRanges(ranges, totalPages);
			const font = await source.embedFont(StandardFonts.Helvetica);
			const orderedSelected = new Map(selectedIndexes.map((pageIndex, index) => [pageIndex, options.startNumber + index]));
			for (const [pageIndex, number] of orderedSelected) {
				const page = source.getPage(pageIndex);
				const { width, height } = page.getSize();
				const label = formatPageNumber(format, number, totalPages);
				const textWidth = font.widthOfTextAtSize(label, options.size);
				const margin = 24;
				let x = margin;
				let y = margin;
				if (position.includes('center')) x = (width - textWidth) / 2;
				if (position.includes('right')) x = width - textWidth - margin;
				if (position.startsWith('top')) y = height - margin;
				if (position === 'bottom-left' || position === 'bottom-center' || position === 'bottom-right') y = margin;
				page.drawText(label, { x: Math.max(margin, x), y: Math.max(margin, y), size: options.size, font, color: rgb(0.25, 0.28, 0.25) });
			}
			const bytes = await source.save();
			triggerDownload(new Blob([bytes], { type: 'application/pdf' }), file.name.replace(/\.pdf$/i, '') + '-numbered.pdf');
			setMessage(`Added page numbers to ${orderedSelected.size} of ${totalPages} pages.`);
		} catch (error) {
			setMessage(pdfErrorMessage(error));
		} finally {
			setBusy(false);
		}
	};

	return (
		<div>
			<div className="tool-control"><label htmlFor="pdf-number-file">PDF file</label><input className="image-file-input" id="pdf-number-file" type="file" accept="application/pdf,.pdf" onChange={(event) => { setFile(event.target.files?.[0] ?? null); setMessage(event.target.files?.[0] ? 'PDF selected. Configure page numbering.' : 'Choose a PDF file.'); }} /></div>
			<div className="tool-choice-row" role="group" aria-label="Page numbering scope"><label className="tool-choice"><input type="checkbox" checked={allPages} onChange={(event) => setAllPages(event.target.checked)} /><span>Number all pages</span></label></div>
			{!allPages && <div className="calc-field"><label htmlFor="pdf-number-ranges">Pages to number (e.g. 1-3, 5, 8-10)</label><input id="pdf-number-ranges" type="text" value={ranges} onChange={(event) => setRanges(event.target.value)} placeholder="1-3, 5, 8-10" /></div>}
			<div className="calc-fields">
				<div className="calc-field"><label htmlFor="pdf-number-position">Position</label><select id="pdf-number-position" value={position} onChange={(event) => setPosition(event.target.value as PageNumberPosition)}><option value="top-left">Top left</option><option value="top-center">Top center</option><option value="top-right">Top right</option><option value="bottom-left">Bottom left</option><option value="bottom-center">Bottom center</option><option value="bottom-right">Bottom right</option></select></div>
				<div className="calc-field"><label htmlFor="pdf-number-format">Format</label><select id="pdf-number-format" value={format} onChange={(event) => setFormat(event.target.value as PageNumberFormat)}><option value="number">Number only</option><option value="page-number">Page N</option><option value="page-of-total">N / Total</option></select></div>
				<div className="calc-field"><label htmlFor="pdf-number-start">Start number</label><input id="pdf-number-start" type="number" min="1" step="1" value={startNumber} onChange={(event) => setStartNumber(Number(event.target.value))} /></div>
				<div className="calc-field"><label htmlFor="pdf-number-size">Font size</label><input id="pdf-number-size" type="number" min="6" max="72" value={size} onChange={(event) => setSize(Number(event.target.value))} /></div>
			</div>
			<div className="tool-actions"><button className="tool-button" type="button" disabled={!file || busy} onClick={() => void numberPages()}>{busy ? 'Adding numbers…' : 'Number PDF pages'}</button></div>
			<p className="tool-message" role="status">{message}</p>
			<p className="privacy-note">Page numbering runs locally in this browser. Password-protected PDFs are not supported.</p>
		</div>
	);
}
