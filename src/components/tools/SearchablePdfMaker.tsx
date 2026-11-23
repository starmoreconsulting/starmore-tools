import { useState } from 'react';
import * as pdfjs from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import Tesseract from 'tesseract.js';
import { triggerDownload } from '../../engines/pdf';
import {
	createSearchablePdf,
	getSearchablePdfRasterScale,
	SEARCHABLE_PDF_MAX_FILE_BYTES,
	SEARCHABLE_PDF_MAX_PAGES,
	type OcrWord,
	type SearchablePdfPageInput,
} from '../../engines/searchable-pdf';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const MAX_OCR_WORDS_PER_PAGE = 20_000;

function openPdf(data: Uint8Array) {
	return pdfjs.getDocument({ data: data.slice(), isEvalSupported: false });
}

function getErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : 'The scanned PDF could not be processed.';
}

function getWords(blocks: Tesseract.Block[] | null): OcrWord[] {
	const words = (blocks ?? []).flatMap((block) => block.paragraphs.flatMap((paragraph) => (
		paragraph.lines.flatMap((line) => line.words.map((word) => ({
			text: word.text,
			x0: word.bbox.x0,
			y0: word.bbox.y0,
			x1: word.bbox.x1,
			y1: word.bbox.y1,
		})))
	)));
	if (words.length > MAX_OCR_WORDS_PER_PAGE) {
		throw new Error(`OCR found too much text on one page. The limit is ${MAX_OCR_WORDS_PER_PAGE.toLocaleString()} words per page.`);
	}
	return words;
}

function canvasToPng(canvas: HTMLCanvasElement): Promise<Uint8Array> {
	return new Promise((resolve, reject) => {
		canvas.toBlob((blob) => {
			if (!blob) {
				reject(new Error('Could not render a PDF page image.'));
				return;
			}
			void blob.arrayBuffer().then((buffer) => resolve(new Uint8Array(buffer))).catch(reject);
		}, 'image/png');
	});
}

export default function SearchablePdfMaker() {
	const [file, setFile] = useState<File | null>(null);
	const [busy, setBusy] = useState(false);
	const [progress, setProgress] = useState(0);
	const [message, setMessage] = useState('Choose a scanned PDF to create a searchable, image-based PDF locally.');
	const [isError, setIsError] = useState(false);

	const makeSearchable = async () => {
		if (!file) return;
		setBusy(true);
		setProgress(0);
		setIsError(false);
		let pdfLoadingTask: ReturnType<typeof openPdf> | undefined;
		let sourcePdf: Awaited<ReturnType<typeof openPdf>['promise']> | undefined;
		let worker: Tesseract.Worker | undefined;
		try {
			const data = new Uint8Array(await file.arrayBuffer());
			pdfLoadingTask = openPdf(data);
			sourcePdf = await pdfLoadingTask.promise;
			if (sourcePdf.numPages < 1) throw new Error('The PDF does not contain any pages.');
			if (sourcePdf.numPages > SEARCHABLE_PDF_MAX_PAGES) {
				throw new Error(`This tool supports PDFs with up to ${SEARCHABLE_PDF_MAX_PAGES} pages.`);
			}

			const pages: SearchablePdfPageInput[] = [];
			worker = await Tesseract.createWorker('eng', 1, {
				logger: (update) => {
					if (typeof update.progress === 'number' && update.status === 'recognizing text') {
						setMessage(`Recognizing page ${pages.length + 1} of ${sourcePdf?.numPages ?? '?'}… ${Math.round(update.progress * 100)}%`);
					}
				},
			});

			for (let pageNumber = 1; pageNumber <= sourcePdf.numPages; pageNumber += 1) {
				setMessage(`Rendering page ${pageNumber} of ${sourcePdf.numPages} locally…`);
				const sourcePage = await sourcePdf.getPage(pageNumber);
				const baseViewport = sourcePage.getViewport({ scale: 1 });
				const scale = getSearchablePdfRasterScale(baseViewport.width, baseViewport.height);
				const viewport = sourcePage.getViewport({ scale });
				const canvas = window.document.createElement('canvas');
				canvas.width = Math.ceil(viewport.width);
				canvas.height = Math.ceil(viewport.height);
				const context = canvas.getContext('2d', { alpha: false });
				if (!context) throw new Error('Your browser could not prepare the PDF page canvas.');
				await sourcePage.render({ canvasContext: context, canvas, viewport, background: '#ffffff' }).promise;
				sourcePage.cleanup();

				setMessage(`Recognizing text on page ${pageNumber} of ${sourcePdf.numPages}…`);
				const image = await canvasToPng(canvas);
				const recognized = await worker.recognize(canvas, {}, { blocks: true });
				pages.push({
					image,
					mimeType: 'image/png',
					width: canvas.width,
					height: canvas.height,
					renderScale: scale,
					words: getWords(recognized.data.blocks),
				});
				canvas.width = 0;
				canvas.height = 0;
				setProgress(Math.round((pageNumber / sourcePdf.numPages) * 100));
			}

			setMessage('Building the searchable PDF…');
			const output = await createSearchablePdf(pages, file.name.replace(/\.pdf$/i, ''));
			const outputName = `${file.name.replace(/\.pdf$/i, '')}-searchable.pdf`;
			triggerDownload(new Blob([output], { type: 'application/pdf' }), outputName);
			setMessage(`Created ${outputName}. Search or copy recognized text to check the OCR result.`);
		} catch (error) {
			setMessage(`Could not create a searchable PDF. ${getErrorMessage(error)}`);
			setIsError(true);
		} finally {
			if (worker) {
				try {
					await worker.terminate();
				} catch (error) {
					setMessage(`Processing finished, but the OCR worker could not be released. ${getErrorMessage(error)}`);
					setIsError(true);
				}
			}
			if (pdfLoadingTask) {
				try {
					await pdfLoadingTask.destroy();
				} catch (error) {
					setMessage(`Processing finished, but the source PDF could not be fully released. ${getErrorMessage(error)}`);
					setIsError(true);
				}
			}
			setBusy(false);
		}
	};

	return (
		<div>
			<div className="calc-field">
				<label htmlFor="searchable-pdf-file">Scanned PDF (up to 50 MB and {SEARCHABLE_PDF_MAX_PAGES} pages)</label>
				<input
					id="searchable-pdf-file"
					type="file"
					accept="application/pdf,.pdf"
					disabled={busy}
					onChange={(event) => {
						const selected = event.currentTarget.files?.[0] ?? null;
						event.currentTarget.value = '';
						setFile(null);
						setIsError(false);
						if (!selected) return;
						if (selected.size > SEARCHABLE_PDF_MAX_FILE_BYTES) {
							setMessage('This PDF exceeds the 50 MB limit. Choose a smaller file.');
							setIsError(true);
							return;
						}
						setFile(selected);
						setProgress(0);
						setMessage(`Selected ${selected.name}. Ready to create a searchable copy.`);
					}}
				/>
			</div>
			<div className="tool-actions">
				<button className="tool-button" type="button" onClick={() => void makeSearchable()} disabled={!file || busy}>
					{busy ? `Processing… ${progress}%` : 'Create searchable PDF'}
				</button>
			</div>
			<p className={`tool-message${isError ? ' error' : ''}`} role="status">{message}</p>
			<p className="privacy-note">PDF pages and OCR run in this browser; no document is uploaded. English OCR model files may be downloaded from the OCR library on first use, so an internet connection is needed. The output uses page images with an invisible searchable text layer; it does not preserve original vector text, forms, annotations, or bookmarks. Review OCR accuracy before relying on extracted text.</p>
		</div>
	);
}
