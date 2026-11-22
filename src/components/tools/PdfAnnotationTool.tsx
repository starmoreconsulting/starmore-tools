import { useEffect, useRef, useState } from 'react';
import * as pdfjs from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { applyPdfAnnotations, PDF_ANNOTATION_MAX_FILE_BYTES, PDF_ANNOTATION_MAX_MARKS, PDF_ANNOTATION_MAX_PAGES, type PdfAnnotation } from '../../engines/pdf-annotation';
import { triggerDownload } from '../../engines/pdf';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

type PdfPreviewDocument = Awaited<ReturnType<typeof openPdfPreview>>;
type MarkMode = 'note' | 'highlight';

interface PreviewSize {
	width: number;
	height: number;
}

interface DragStart {
	x: number;
	y: number;
}

async function openPdfPreview(data: Uint8Array) {
	const task = pdfjs.getDocument({ data: data.slice(), isEvalSupported: false });
	return task.promise;
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

function getErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : 'Could not process this PDF.';
}

export default function PdfAnnotationTool() {
	const [pdfData, setPdfData] = useState<Uint8Array | null>(null);
	const [preview, setPreview] = useState<PdfPreviewDocument | null>(null);
	const [fileName, setFileName] = useState('');
	const [pageCount, setPageCount] = useState(0);
	const [pageNumber, setPageNumber] = useState(1);
	const [previewSize, setPreviewSize] = useState<PreviewSize | null>(null);
	const [mode, setMode] = useState<MarkMode>('note');
	const [noteText, setNoteText] = useState('');
	const [annotations, setAnnotations] = useState<PdfAnnotation[]>([]);
	const [draftHighlight, setDraftHighlight] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
	const [busy, setBusy] = useState(false);
	const [message, setMessage] = useState('Choose a PDF to add text notes or highlights to selected pages.');
	const [isError, setIsError] = useState(false);
	const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
	const annotationCanvasRef = useRef<HTMLCanvasElement>(null);
	const dragStartRef = useRef<DragStart | null>(null);

	useEffect(() => {
		if (!preview || !pdfCanvasRef.current) return;
		let cancelled = false;
		let renderTask: ReturnType<Awaited<ReturnType<typeof preview.getPage>>['render']> | undefined;

		void (async () => {
			try {
				const page = await preview.getPage(pageNumber);
				if (cancelled || !pdfCanvasRef.current) return;
				const initialViewport = page.getViewport({ scale: 1 });
				const scale = Math.min(1.25, 900 / initialViewport.width);
				const viewport = page.getViewport({ scale });
				const canvas = pdfCanvasRef.current;
				const context = canvas.getContext('2d');
				if (!context) throw new Error('PDF preview canvas is unavailable in this browser.');
				const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
				canvas.width = Math.ceil(viewport.width * pixelRatio);
				canvas.height = Math.ceil(viewport.height * pixelRatio);
				canvas.style.width = '100%';
				canvas.style.height = '100%';
				setPreviewSize({ width: viewport.width, height: viewport.height });
				renderTask = page.render({
					canvas,
					canvasContext: context,
					viewport,
					transform: pixelRatio === 1 ? undefined : [pixelRatio, 0, 0, pixelRatio, 0, 0],
				});
				await renderTask.promise;
			} catch (error) {
				if (!cancelled) {
					setMessage(`Could not render this PDF page. ${getErrorMessage(error)}`);
					setIsError(true);
				}
			}
		})();

		return () => {
			cancelled = true;
			renderTask?.cancel();
		};
	}, [preview, pageNumber]);

	useEffect(() => {
		const canvas = annotationCanvasRef.current;
		if (!canvas || !previewSize) return;
		const ratio = Math.min(window.devicePixelRatio || 1, 2);
		canvas.width = Math.ceil(previewSize.width * ratio);
		canvas.height = Math.ceil(previewSize.height * ratio);
		const context = canvas.getContext('2d');
		if (!context) return;
		context.scale(ratio, ratio);
		context.clearRect(0, 0, previewSize.width, previewSize.height);

		const pageAnnotations = annotations.filter((annotation) => annotation.pageIndex === pageNumber - 1);
		for (const annotation of pageAnnotations) {
			if (annotation.type === 'highlight') {
				context.fillStyle = 'rgba(255, 220, 40, 0.38)';
				context.strokeStyle = 'rgba(180, 130, 0, 0.75)';
				context.lineWidth = 1.5;
				const x = annotation.x * previewSize.width;
				const y = annotation.y * previewSize.height;
				const width = annotation.width * previewSize.width;
				const height = annotation.height * previewSize.height;
				context.fillRect(x, y, width, height);
				context.strokeRect(x, y, width, height);
			} else {
				const x = clamp(annotation.x * previewSize.width, 0, previewSize.width - 180);
				const y = clamp(annotation.y * previewSize.height, 0, previewSize.height - 42);
				context.fillStyle = 'rgba(255, 245, 180, 0.96)';
				context.strokeStyle = '#9b7a24';
				context.lineWidth = 1;
				context.fillRect(x, y, 180, 42);
				context.strokeRect(x, y, 180, 42);
				context.fillStyle = '#262116';
				context.font = '12px sans-serif';
				context.textBaseline = 'top';
				const words = annotation.text.split(/\s+/);
				let line = '';
				let lineNumber = 0;
				for (const word of words) {
					const candidate = line ? `${line} ${word}` : word;
					if (line && context.measureText(candidate).width > 164) {
						context.fillText(line, x + 8, y + 7 + lineNumber * 15);
						line = word;
						lineNumber += 1;
						if (lineNumber >= 2) break;
					} else line = candidate;
				}
				if (lineNumber < 2 && line) context.fillText(line, x + 8, y + 7 + lineNumber * 15);
			}
		}

		if (draftHighlight) {
			context.fillStyle = 'rgba(255, 220, 40, 0.25)';
			context.strokeStyle = '#8b6a00';
			context.setLineDash([5, 3]);
			context.fillRect(
				draftHighlight.x * previewSize.width,
				draftHighlight.y * previewSize.height,
				draftHighlight.width * previewSize.width,
				draftHighlight.height * previewSize.height,
			);
			context.strokeRect(
				draftHighlight.x * previewSize.width,
				draftHighlight.y * previewSize.height,
				draftHighlight.width * previewSize.width,
				draftHighlight.height * previewSize.height,
			);
			context.setLineDash([]);
		}
	}, [annotations, draftHighlight, pageNumber, previewSize]);

	const loadPdf = async (file?: File) => {
		if (!file) return;
		setPreview(null);
		setPdfData(null);
		setAnnotations([]);
		setPreviewSize(null);
		setIsError(false);
		if (file.size > PDF_ANNOTATION_MAX_FILE_BYTES) {
			setMessage('This PDF exceeds the 50 MB limit. Choose a smaller file.');
			setIsError(true);
			return;
		}

		setBusy(true);
		setMessage('Loading PDF pages locally…');
		try {
			const data = new Uint8Array(await file.arrayBuffer());
			const document = await openPdfPreview(data);
			if (document.numPages > PDF_ANNOTATION_MAX_PAGES) {
				await document.destroy();
				throw new Error(`This tool supports PDFs with up to ${PDF_ANNOTATION_MAX_PAGES} pages.`);
			}
			if (document.numPages < 1) {
				await document.destroy();
				throw new Error('This PDF does not contain any pages.');
			}
			setPdfData(data);
			setPreview(document);
			setFileName(file.name);
			setPageCount(document.numPages);
			setPageNumber(1);
			setMessage(`Loaded ${file.name} with ${document.numPages} page${document.numPages === 1 ? '' : 's'}. Choose a tool and add annotations on the page preview.`);
		} catch (error) {
			setMessage(`Could not open this PDF. ${getErrorMessage(error)}`);
			setIsError(true);
		} finally {
			setBusy(false);
		}
	};

	const pointerPosition = (event: React.PointerEvent<HTMLCanvasElement>) => {
		const bounds = event.currentTarget.getBoundingClientRect();
		return {
			x: clamp((event.clientX - bounds.left) / bounds.width, 0, 1),
			y: clamp((event.clientY - bounds.top) / bounds.height, 0, 1),
		};
	};

	const addAnnotation = (event: React.PointerEvent<HTMLCanvasElement>) => {
		if (!previewSize || annotations.length >= PDF_ANNOTATION_MAX_MARKS) return;
		const point = pointerPosition(event);
		if (mode === 'note') {
			const text = noteText.trim();
			if (!text) {
				setMessage('Enter the note text, then click where you want it on the page.');
				setIsError(true);
				return;
			}
			setAnnotations((current) => [...current, { type: 'note', pageIndex: pageNumber - 1, ...point, text }]);
			setMessage(`Placed a note on page ${pageNumber}.`);
			setIsError(false);
			return;
		}
		dragStartRef.current = point;
		event.currentTarget.setPointerCapture(event.pointerId);
		setDraftHighlight({ ...point, width: 0, height: 0 });
	};

	const moveHighlight = (event: React.PointerEvent<HTMLCanvasElement>) => {
		if (mode !== 'highlight' || !dragStartRef.current) return;
		const point = pointerPosition(event);
		const start = dragStartRef.current;
		const left = Math.min(start.x, point.x);
		const top = Math.min(start.y, point.y);
		setDraftHighlight({ x: left, y: top, width: Math.abs(point.x - start.x), height: Math.abs(point.y - start.y) });
	};

	const finishHighlight = (event: React.PointerEvent<HTMLCanvasElement>) => {
		const start = dragStartRef.current;
		if (mode !== 'highlight' || !start) return;
		dragStartRef.current = null;
		const point = pointerPosition(event);
		const x = Math.min(start.x, point.x);
		const y = Math.min(start.y, point.y);
		const width = Math.abs(point.x - start.x);
		const height = Math.abs(point.y - start.y);
		setDraftHighlight(null);
		if (width < 0.008 || height < 0.004) {
			setMessage('Drag across an area of the page to create a highlight.');
			return;
		}
		if (annotations.length >= PDF_ANNOTATION_MAX_MARKS) {
			setMessage(`This PDF already has the maximum of ${PDF_ANNOTATION_MAX_MARKS} annotations.`);
			return;
		}
		setAnnotations((current) => [...current, { type: 'highlight', pageIndex: pageNumber - 1, x, y, width, height }]);
		setMessage(`Added a highlight to page ${pageNumber}.`);
		setIsError(false);
	};

	const downloadAnnotatedPdf = async () => {
		if (!pdfData) return;
		setBusy(true);
		setIsError(false);
		try {
			const bytes = await applyPdfAnnotations(pdfData, annotations);
			const name = `${fileName.replace(/\.pdf$/i, '')}-annotated.pdf`;
			triggerDownload(new Blob([bytes], { type: 'application/pdf' }), name);
			setMessage(`Downloaded ${name}. Notes and highlights are flattened into page content and are not editable PDF comment annotations.`);
		} catch (error) {
			setMessage(getErrorMessage(error));
			setIsError(true);
		} finally {
			setBusy(false);
		}
	};

	const removeAnnotation = (indexToRemove: number) => {
		setAnnotations((current) => current.filter((_, index) => index !== indexToRemove));
	};

	return (
		<div>
			<div className="calc-field">
				<label htmlFor="pdf-annotation-file">PDF file (up to 50 MB and {PDF_ANNOTATION_MAX_PAGES} pages)</label>
				<input
					id="pdf-annotation-file"
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
			{preview && (
				<>
					<div className="pdf-annotation-controls">
						<div className="calc-field">
							<label htmlFor="pdf-annotation-mode">Annotation</label>
							<select id="pdf-annotation-mode" value={mode} onChange={(event) => setMode(event.target.value as MarkMode)}>
								<option value="note">Place text note</option>
								<option value="highlight">Draw highlight</option>
							</select>
						</div>
						{mode === 'note' && (
							<div className="calc-field">
								<label htmlFor="pdf-annotation-note">Note text (maximum {240} characters)</label>
								<input id="pdf-annotation-note" type="text" maxLength={240} value={noteText} onChange={(event) => setNoteText(event.target.value)} placeholder="Enter a note, then click the page" />
							</div>
						)}
					</div>
					<div className="pdf-annotation-page-controls">
						<button className="tool-button secondary" type="button" onClick={() => setPageNumber((current) => Math.max(1, current - 1))} disabled={pageNumber <= 1 || busy}>Previous page</button>
						<span>Page {pageNumber} of {pageCount}</span>
						<button className="tool-button secondary" type="button" onClick={() => setPageNumber((current) => Math.min(pageCount, current + 1))} disabled={pageNumber >= pageCount || busy}>Next page</button>
					</div>
					<div className="pdf-annotation-preview" style={previewSize ? { aspectRatio: `${previewSize.width} / ${previewSize.height}` } : undefined}>
						<canvas ref={pdfCanvasRef} aria-label={`Preview of PDF page ${pageNumber}`} />
						{previewSize && (
							<canvas
								ref={annotationCanvasRef}
								className={`pdf-annotation-layer ${mode === 'note' ? 'placing-note' : 'drawing-highlight'}`}
								aria-label="Page annotation surface"
								onPointerDown={addAnnotation}
								onPointerMove={moveHighlight}
								onPointerUp={finishHighlight}
								onPointerCancel={() => { dragStartRef.current = null; setDraftHighlight(null); }}
							/>
						)}
					</div>
					<p className="tool-message">{mode === 'note' ? 'Enter a note, then click the page to place it.' : 'Drag across an area of the page to highlight it.'}</p>
					{annotations.length > 0 && (
						<div className="pdf-annotation-list">
							<h2>Annotations ({annotations.length})</h2>
							<ul>
								{annotations.map((annotation, index) => (
									<li key={`${annotation.pageIndex}-${index}`}>
										<span>Page {annotation.pageIndex + 1} · {annotation.type === 'note' ? `Note: ${annotation.text}` : 'Highlight area'}</span>
										<button className="tool-button secondary" type="button" onClick={() => removeAnnotation(index)} disabled={busy}>Remove</button>
									</li>
								))}
							</ul>
						</div>
					)}
					<div className="tool-actions">
						<button className="tool-button" type="button" onClick={() => void downloadAnnotatedPdf()} disabled={busy || annotations.length === 0}>
							{busy ? 'Preparing PDF…' : 'Download annotated PDF'}
						</button>
					</div>
				</>
			)}
			<p className={`tool-message${isError ? ' error' : ''}`} role="status">{message}</p>
			<p className="tool-message">PDF previews and annotations are processed locally. Notes and highlights are flattened into the page content, so they are not editable comment annotations. Password-protected PDFs are not supported. Text notes use a standard PDF font and may be limited to basic Latin characters.</p>
		</div>
	);
}
