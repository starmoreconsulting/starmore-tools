import { useState } from 'react';
import * as pdfjs from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { formatExtractedPdfText, parsePdfTextPageSelection, extractPdfTextPages, PDF_TEXT_EXTRACTOR_MAX_FILE_BYTES, PDF_TEXT_EXTRACTOR_MAX_PAGES } from '../../engines/pdf-text-extractor';
import { triggerDownload } from '../../engines/pdf';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

function openPdf(data: Uint8Array) {
	return pdfjs.getDocument({ data: data.slice(), isEvalSupported: false }).promise;
}

function getErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : 'Could not extract text from this PDF.';
}

export default function PdfTextExtractor() {
	const [pdfData, setPdfData] = useState<Uint8Array | null>(null);
	const [fileName, setFileName] = useState('');
	const [pageCount, setPageCount] = useState(0);
	const [pageSelection, setPageSelection] = useState('');
	const [output, setOutput] = useState('');
	const [busy, setBusy] = useState(false);
	const [message, setMessage] = useState('Choose a PDF to extract selectable text locally.');
	const [isError, setIsError] = useState(false);

	const loadPdf = async (file?: File) => {
		if (!file) return;
		setPdfData(null);
		setFileName('');
		setPageCount(0);
		setOutput('');
		setIsError(false);
		if (file.size > PDF_TEXT_EXTRACTOR_MAX_FILE_BYTES) {
			setMessage('This PDF exceeds the 50 MB limit. Choose a smaller file.');
			setIsError(true);
			return;
		}

		setBusy(true);
		setMessage('Checking PDF pages locally…');
		try {
			const data = new Uint8Array(await file.arrayBuffer());
			const document = await openPdf(data);
			const count = document.numPages;
			await document.destroy();
			if (count < 1) throw new Error('This PDF does not contain any pages.');
			if (count > PDF_TEXT_EXTRACTOR_MAX_PAGES) {
				throw new Error(`This tool supports PDFs with up to ${PDF_TEXT_EXTRACTOR_MAX_PAGES} pages.`);
			}
			setPdfData(data);
			setFileName(file.name);
			setPageCount(count);
			setPageSelection(`1-${count}`);
			setMessage(`Loaded ${file.name} with ${count} page${count === 1 ? '' : 's'}. Choose which pages to extract.`);
		} catch (error) {
			setMessage(`Could not open this PDF. ${getErrorMessage(error)}`);
			setIsError(true);
		} finally {
			setBusy(false);
		}
	};

	const extract = async () => {
		if (!pdfData) return;
		let pageIndices: number[];
		try {
			pageIndices = parsePdfTextPageSelection(pageSelection, pageCount);
		} catch (error) {
			setMessage(getErrorMessage(error));
			setIsError(true);
			return;
		}

		setBusy(true);
		setIsError(false);
		setOutput('');
		setMessage('Opening PDF text content…');
		let document: Awaited<ReturnType<typeof openPdf>> | undefined;
		try {
			document = await openPdf(pdfData);
			const pages = await extractPdfTextPages(document, pageIndices, (pageNumber, total) => {
				setMessage(`Extracting page ${pageNumber} (${pageIndices.indexOf(pageNumber - 1) + 1} of ${total})…`);
			});
			const text = formatExtractedPdfText(pages);
			setOutput(text);
			const textPages = pages.filter((page) => page.text.length > 0).length;
			if (textPages === 0) {
				setMessage('No selectable text was found in the selected pages. They may be scanned images and need OCR.');
			} else {
				setMessage(`Extracted selectable text from ${textPages} of ${pages.length} selected page${pages.length === 1 ? '' : 's'}.`);
			}
		} catch (error) {
			setMessage(getErrorMessage(error));
			setIsError(true);
		} finally {
			if (document) {
				try {
					await document.destroy();
				} catch (error) {
					setMessage(`Text extraction finished, but the PDF could not be fully released. ${getErrorMessage(error)}`);
					setIsError(true);
				}
			}
			setBusy(false);
		}
	};

	const copy = async () => {
		if (!output) return;
		try {
			if (!navigator.clipboard?.writeText) throw new Error('Clipboard access is unavailable in this browser.');
			await navigator.clipboard.writeText(output);
			setMessage('Extracted text copied to the clipboard.');
			setIsError(false);
		} catch {
			setMessage('Could not access the clipboard. Select the extracted text and copy it instead.');
			setIsError(true);
		}
	};

	const download = () => {
		if (!output) return;
		const name = `${fileName.replace(/\.pdf$/i, '')}-extracted.txt`;
		triggerDownload(new Blob([output], { type: 'text/plain;charset=utf-8' }), name);
		setMessage(`Downloaded extracted text as ${name}.`);
		setIsError(false);
	};

	return (
		<div>
			<div className="calc-field">
				<label htmlFor="pdf-text-extractor-file">PDF file (up to 50 MB and {PDF_TEXT_EXTRACTOR_MAX_PAGES} pages)</label>
				<input
					id="pdf-text-extractor-file"
					type="file"
					accept="application/pdf,.pdf"
					onChange={(event) => {
						const file = event.currentTarget.files?.[0];
						event.currentTarget.value = '';
						void loadPdf(file);
					}}
					disabled={busy}
				/>
			</div>
			{pdfData && (
				<>
					<div className="calc-field">
						<label htmlFor="pdf-text-extractor-pages">Pages to extract (e.g. 1-3, 5)</label>
						<input
							id="pdf-text-extractor-pages"
							type="text"
							value={pageSelection}
							onChange={(event) => setPageSelection(event.target.value)}
							placeholder={`1-${pageCount}`}
							disabled={busy}
						/>
					</div>
					<div className="tool-actions">
						<button className="tool-button" type="button" onClick={() => void extract()} disabled={busy}>
							{busy ? 'Extracting…' : 'Extract text'}
						</button>
						{output && (
							<>
								<button className="tool-button secondary" type="button" onClick={() => void copy()} disabled={busy}>Copy text</button>
								<button className="tool-button secondary" type="button" onClick={download} disabled={busy}>Download .txt</button>
							</>
						)}
					</div>
				</>
			)}
			{output && (
				<div className="calc-field">
					<label htmlFor="pdf-text-extractor-output">Extracted text</label>
					<textarea id="pdf-text-extractor-output" value={output} readOnly rows={16} spellCheck={false} />
				</div>
			)}
			<p className={`tool-message${isError ? ' error' : ''}`} role="status">{message}</p>
			<p className="tool-message">Extracts selectable text from unlocked PDFs locally. Scanned pages that contain only images do not have selectable text and require OCR. Layout, columns, and complex formatting may not be preserved.</p>
		</div>
	);
}
