import { useEffect, useRef, useState } from 'react';
import * as pdfjs from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { triggerDownload } from '../../engines/pdf';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const MAX_FILE_BYTES = 50_000_000;
const MAX_PAGES = 200;

interface LoadedPdf {
	name: string;
	document: PDFDocumentProxy;
	pageCount: number;
}

interface CompareSideProps {
	label: string;
	file: LoadedPdf;
	pageNumber: number;
	canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

function getErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : 'Could not open this PDF.';
}

function CompareSide({ label, file, pageNumber, canvasRef }: CompareSideProps) {
	const hasPage = pageNumber <= file.pageCount;
	return (
		<section className="pdf-comparison-side" aria-label={`${label} preview`}>
			<header>
				<strong>{label}</strong>
				<span title={file.name}>{file.name}</span>
			</header>
			<p>Page {hasPage ? pageNumber : '—'} of {file.pageCount}</p>
			{hasPage
				? <canvas ref={canvasRef} aria-label={`${label}, page ${pageNumber}`} />
				: <div className="pdf-comparison-missing" role="status">No page {pageNumber} in this PDF.</div>}
		</section>
	);
}

export default function PdfComparisonTool() {
	const [left, setLeft] = useState<LoadedPdf | null>(null);
	const [right, setRight] = useState<LoadedPdf | null>(null);
	const [pageNumber, setPageNumber] = useState(1);
	const [busySide, setBusySide] = useState<'left' | 'right' | null>(null);
	const [message, setMessage] = useState('Choose two PDFs to compare matching pages side by side.');
	const [isError, setIsError] = useState(false);
	const leftCanvasRef = useRef<HTMLCanvasElement>(null);
	const rightCanvasRef = useRef<HTMLCanvasElement>(null);
	const requestIds = useRef({ left: 0, right: 0 });
	const documentRefs = useRef<Record<'left' | 'right', PDFDocumentProxy | null>>({ left: null, right: null });

	useEffect(() => () => {
		requestIds.current.left += 1;
		requestIds.current.right += 1;
		for (const side of ['left', 'right'] as const) {
			const document = documentRefs.current[side];
			documentRefs.current[side] = null;
			if (document) void document.destroy();
		}
	}, []);

	const loadPdf = async (side: 'left' | 'right', file?: File) => {
		if (!file) return;
		const requestId = ++requestIds.current[side];
		const previousDocument = documentRefs.current[side];
		documentRefs.current[side] = null;
		if (previousDocument) await previousDocument.destroy();
		if (side === 'left') setLeft(null);
		else setRight(null);
		setIsError(false);
		if (file.size > MAX_FILE_BYTES) {
			setMessage(`${file.name} exceeds the 50 MB limit. Choose a smaller PDF.`);
			setIsError(true);
			return;
		}

		setBusySide(side);
		setMessage(`Loading ${side === 'left' ? 'PDF A' : 'PDF B'} locally…`);
		try {
			const data = new Uint8Array(await file.arrayBuffer());
			const task = pdfjs.getDocument({ data: data.slice(), isEvalSupported: false });
			const document = await task.promise;
			if (requestIds.current[side] !== requestId) {
				await document.destroy();
				return;
			}
			if (document.numPages < 1) {
				await document.destroy();
				throw new Error('The PDF does not contain any pages.');
			}
			if (document.numPages > MAX_PAGES) {
				await document.destroy();
				throw new Error(`This tool supports PDFs with up to ${MAX_PAGES} pages each.`);
			}

			documentRefs.current[side] = document;
			const loaded = { name: file.name, document, pageCount: document.numPages };
			if (side === 'left') setLeft(loaded);
			else setRight(loaded);
			setPageNumber(1);
			setMessage(`${side === 'left' ? 'PDF A' : 'PDF B'} loaded: ${file.name} (${document.numPages} pages).`);
		} catch (error) {
			if (requestIds.current[side] === requestId) {
				setMessage(`Could not load ${file.name}. ${getErrorMessage(error)}`);
				setIsError(true);
			}
		} finally {
			if (requestIds.current[side] === requestId) setBusySide(null);
		}
	};

	useEffect(() => {
		if (!left && !right) return;
		let cancelled = false;
		const renderTasks: Array<ReturnType<Awaited<ReturnType<PDFDocumentProxy['getPage']>>['render']>> = [];

		const renderSide = async (file: LoadedPdf | null, canvas: HTMLCanvasElement | null, sideName: string) => {
			if (!file || !canvas || pageNumber > file.pageCount) return;
			const page = await file.document.getPage(pageNumber);
			if (cancelled) return;
			const initialViewport = page.getViewport({ scale: 1 });
			const scale = Math.min(1.1, 620 / initialViewport.width);
			const viewport = page.getViewport({ scale });
			const context = canvas.getContext('2d');
			if (!context) throw new Error('PDF preview canvas is unavailable in this browser.');
			const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
			canvas.width = Math.ceil(viewport.width * pixelRatio);
			canvas.height = Math.ceil(viewport.height * pixelRatio);
			const task = page.render({
				canvas,
				canvasContext: context,
				viewport,
				transform: pixelRatio === 1 ? undefined : [pixelRatio, 0, 0, pixelRatio, 0, 0],
			});
			renderTasks.push(task);
			await task.promise;
		};

		void Promise.all([
			renderSide(left, leftCanvasRef.current, 'PDF A'),
			renderSide(right, rightCanvasRef.current, 'PDF B'),
		]).catch((error: unknown) => {
			if (!cancelled) {
				setMessage(`Could not render the comparison preview. ${getErrorMessage(error)}`);
				setIsError(true);
			}
		});

		return () => {
			cancelled = true;
			renderTasks.forEach((task) => task.cancel());
		};
	}, [left, right, pageNumber]);

	const copyPage = async () => {
		if (!left || !right) return;
		const summary = [
			`PDF Comparison — Page ${pageNumber}`,
			`PDF A: ${left.name} (${left.pageCount} pages)`,
			`PDF B: ${right.name} (${right.pageCount} pages)`,
			'Visual previews are shown side by side. Review them manually; no automatic difference score is calculated.',
		].join('\n');
		try {
			if (!navigator.clipboard?.writeText) throw new Error('Clipboard access is unavailable in this browser.');
			await navigator.clipboard.writeText(summary);
			setMessage('Comparison summary copied to the clipboard.');
			setIsError(false);
		} catch {
			setMessage('Could not access the clipboard. Review the PDFs side by side instead.');
			setIsError(true);
		}
	};

	const downloadPdf = (pdf: LoadedPdf | null) => {
		if (!pdf) return;
		void pdf.document.getData().then((data) => {
			const name = `${pdf.name.replace(/\.pdf$/i, '')}-comparison-copy.pdf`;
			triggerDownload(new Blob([data], { type: 'application/pdf' }), name);
			setMessage(`Downloaded ${name}.`);
			setIsError(false);
		}).catch((error: unknown) => {
			setMessage(`Could not download the selected PDF. ${getErrorMessage(error)}`);
			setIsError(true);
		});
	};

	const maxPages = Math.max(left?.pageCount ?? 0, right?.pageCount ?? 0);
	const bothLoaded = Boolean(left && right);

	return (
		<div>
			<div className="pdf-comparison-inputs">
				<div className="calc-field">
					<label htmlFor="pdf-comparison-a">PDF A (maximum 50 MB, 200 pages)</label>
					<input
						id="pdf-comparison-a"
						type="file"
						accept="application/pdf,.pdf"
						disabled={busySide !== null}
						onChange={(event) => {
							const file = event.currentTarget.files?.[0];
							event.currentTarget.value = '';
							void loadPdf('left', file);
						}}
					/>
				</div>
				<div className="calc-field">
					<label htmlFor="pdf-comparison-b">PDF B (maximum 50 MB, 200 pages)</label>
					<input
						id="pdf-comparison-b"
						type="file"
						accept="application/pdf,.pdf"
						disabled={busySide !== null}
						onChange={(event) => {
							const file = event.currentTarget.files?.[0];
							event.currentTarget.value = '';
							void loadPdf('right', file);
						}}
					/>
				</div>
			</div>
			{bothLoaded && (
				<>
					<div className="pdf-comparison-stats" aria-live="polite">
						<span>PDF A: {left!.pageCount} pages</span>
						<span>PDF B: {right!.pageCount} pages</span>
						<span>{left!.pageCount === right!.pageCount ? 'Page counts match' : `Page count differs by ${Math.abs(left!.pageCount - right!.pageCount)}`}</span>
					</div>
					<div className="pdf-comparison-controls">
						<button className="tool-button secondary" type="button" onClick={() => setPageNumber((current) => Math.max(1, current - 1))} disabled={pageNumber <= 1 || busySide !== null}>Previous page</button>
						<label htmlFor="pdf-comparison-page">Compare page</label>
						<input id="pdf-comparison-page" type="number" min="1" max={maxPages} value={pageNumber} onChange={(event) => {
							const value = Number(event.target.value);
							if (Number.isSafeInteger(value) && value >= 1 && value <= maxPages) setPageNumber(value);
						}} />
						<span>of {maxPages}</span>
						<button className="tool-button secondary" type="button" onClick={() => setPageNumber((current) => Math.min(maxPages, current + 1))} disabled={pageNumber >= maxPages || busySide !== null}>Next page</button>
					</div>
					<p className="tool-message">Compare matching page numbers. Pages beyond the shorter document are marked as missing.</p>
					<div className="pdf-comparison-grid">
						<CompareSide label="PDF A" file={left!} pageNumber={pageNumber} canvasRef={leftCanvasRef} />
						<CompareSide label="PDF B" file={right!} pageNumber={pageNumber} canvasRef={rightCanvasRef} />
					</div>
					<div className="tool-actions">
						<button className="tool-button secondary" type="button" onClick={() => void copyPage()}>Copy comparison summary</button>
						<button className="tool-button secondary" type="button" onClick={() => downloadPdf(left)}>Download PDF A</button>
						<button className="tool-button secondary" type="button" onClick={() => downloadPdf(right)}>Download PDF B</button>
					</div>
				</>
			)}
			<p className={`tool-message${isError ? ' error' : ''}`} role="status">{message}</p>
			<p className="tool-message">Both PDFs are rendered locally in your browser and are not uploaded or changed. This tool provides side-by-side visual previews only; it does not calculate an automatic difference score or merge the files.</p>
		</div>
	);
}
