import { useEffect, useRef, useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import { triggerDownload } from '../../engines/pdf';
import {
	detectDocumentCorners,
	enhanceScannedImage,
	rectifyDocumentImage,
	validateScanCorners,
	type ScanCorners,
	type ScanEnhancement,
	type ScanImage,
} from '../../engines/document-scanner';

const MAX_FILE_BYTES = 30_000_000;
const MAX_CAPTURE_EDGE = 2400;
const MAX_PAGES = 30;

interface ScanPage {
	id: number;
	name: string;
	width: number;
	height: number;
	data: Uint8ClampedArray;
}

function canvasToPng(canvas: HTMLCanvasElement): Promise<Uint8Array> {
	return new Promise((resolve, reject) => {
		canvas.toBlob((blob) => {
			if (!blob) {
				reject(new Error('Could not prepare the scanned page image.'));
				return;
			}
			void blob.arrayBuffer().then((buffer) => resolve(new Uint8Array(buffer))).catch(reject);
		}, 'image/png');
	});
}

function closeStream(stream: MediaStream | null): void {
	stream?.getTracks().forEach((track) => track.stop());
}

export default function DocumentScanner() {
	const [cameraActive, setCameraActive] = useState(false);
	const [sourceImage, setSourceImage] = useState<ScanImage | null>(null);
	const [sourceName, setSourceName] = useState('');
	const [corners, setCorners] = useState<ScanCorners | null>(null);
	const [enhancement, setEnhancement] = useState<ScanEnhancement>('color');
	const [scannedImage, setScannedImage] = useState<ScanImage | null>(null);
	const [pages, setPages] = useState<ScanPage[]>([]);
	const [busy, setBusy] = useState(false);
	const [message, setMessage] = useState('Capture a document with your camera or choose an image to scan.');
	const [isError, setIsError] = useState(false);
	const videoRef = useRef<HTMLVideoElement>(null);
	const cameraStreamRef = useRef<MediaStream | null>(null);
	const sourceCanvasRef = useRef<HTMLCanvasElement>(null);
	const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
	const resultCanvasRef = useRef<HTMLCanvasElement>(null);
	const dragCornerRef = useRef<number | null>(null);
	const nextPageIdRef = useRef(1);

	useEffect(() => () => closeStream(cameraStreamRef.current), []);

	useEffect(() => {
		if (!cameraActive || !videoRef.current || !cameraStreamRef.current) return;
		videoRef.current.srcObject = cameraStreamRef.current;
		void videoRef.current.play().catch((error: unknown) => {
			setMessage(`Camera preview could not start. ${error instanceof Error ? error.message : 'Check camera permissions.'}`);
			setIsError(true);
		});
	}, [cameraActive]);

	useEffect(() => {
		const sourceCanvas = sourceCanvasRef.current;
		const overlayCanvas = overlayCanvasRef.current;
		if (!sourceCanvas || !overlayCanvas || !sourceImage) return;
		sourceCanvas.width = sourceImage.width;
		sourceCanvas.height = sourceImage.height;
		overlayCanvas.width = sourceImage.width;
		overlayCanvas.height = sourceImage.height;
		const sourceContext = sourceCanvas.getContext('2d');
		const overlayContext = overlayCanvas.getContext('2d');
		if (!sourceContext || !overlayContext) return;
		sourceContext.putImageData(new ImageData(sourceImage.data, sourceImage.width, sourceImage.height), 0, 0);
		overlayContext.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
		if (!corners) return;
		overlayContext.strokeStyle = '#11c7d4';
		overlayContext.lineWidth = Math.max(2, sourceImage.width / 500);
		overlayContext.fillStyle = '#f97316';
		overlayContext.beginPath();
		corners.forEach((point, index) => {
			if (index === 0) overlayContext.moveTo(point.x, point.y);
			else overlayContext.lineTo(point.x, point.y);
		});
		overlayContext.closePath();
		overlayContext.stroke();
		const radius = Math.max(9, sourceImage.width / 55);
		corners.forEach((point, index) => {
			overlayContext.beginPath();
			overlayContext.arc(point.x, point.y, radius, 0, Math.PI * 2);
			overlayContext.fill();
			overlayContext.strokeStyle = '#fff';
			overlayContext.lineWidth = Math.max(2, sourceImage.width / 600);
			overlayContext.stroke();
			overlayContext.fillStyle = '#fff';
			overlayContext.font = `bold ${Math.max(14, radius)}px sans-serif`;
			overlayContext.textAlign = 'center';
			overlayContext.textBaseline = 'middle';
			overlayContext.fillText(String(index + 1), point.x, point.y);
			overlayContext.fillStyle = '#f97316';
			overlayContext.strokeStyle = '#11c7d4';
		});
	}, [sourceImage, corners]);

	useEffect(() => {
		const canvas = resultCanvasRef.current;
		if (!canvas || !scannedImage) return;
		canvas.width = scannedImage.width;
		canvas.height = scannedImage.height;
		const context = canvas.getContext('2d');
		if (context) context.putImageData(new ImageData(scannedImage.data, scannedImage.width, scannedImage.height), 0, 0);
	}, [scannedImage]);

	const receiveImage = (image: ScanImage, name: string) => {
		setSourceImage(image);
		setSourceName(name);
		setScannedImage(null);
		setIsError(false);
		try {
			const detected = detectDocumentCorners(image);
			setCorners(detected);
			setMessage('Page edges detected. Drag the numbered corners to adjust, then correct perspective.');
		} catch (error) {
			setCorners([
				{ x: 0, y: 0 },
				{ x: image.width - 1, y: 0 },
				{ x: image.width - 1, y: image.height - 1 },
				{ x: 0, y: image.height - 1 },
			]);
			setMessage(`${error instanceof Error ? error.message : 'Could not detect page edges.'} Adjust the corners manually.`);
		}
	};

	const openCamera = async () => {
		if (!navigator.mediaDevices?.getUserMedia) {
			setMessage('Camera access is not available here. Use image upload instead.');
			setIsError(true);
			return;
		}
		try {
			const stream = await navigator.mediaDevices.getUserMedia({
				video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
				audio: false,
			});
			cameraStreamRef.current = stream;
			setCameraActive(true);
			setIsError(false);
			setMessage('Camera ready. Frame a document on a contrasting surface and capture it.');
		} catch (error) {
			setMessage(`Could not access the camera. ${error instanceof Error ? error.message : 'Check camera permissions or choose an image file.'}`);
			setIsError(true);
		}
	};

	const stopCamera = () => {
		closeStream(cameraStreamRef.current);
		cameraStreamRef.current = null;
		if (videoRef.current) videoRef.current.srcObject = null;
		setCameraActive(false);
	};

	const captureImage = async () => {
		const video = videoRef.current;
		if (!video || !video.videoWidth || !video.videoHeight) {
			setMessage('The camera is still starting. Wait a moment and try again.');
			setIsError(true);
			return;
		}
		const scale = Math.min(1, MAX_CAPTURE_EDGE / Math.max(video.videoWidth, video.videoHeight));
		const canvas = document.createElement('canvas');
		canvas.width = Math.max(2, Math.round(video.videoWidth * scale));
		canvas.height = Math.max(2, Math.round(video.videoHeight * scale));
		const context = canvas.getContext('2d');
		if (!context) {
			setMessage('Camera capture is not available in this browser.');
			setIsError(true);
			return;
		}
		context.drawImage(video, 0, 0, canvas.width, canvas.height);
		const image = context.getImageData(0, 0, canvas.width, canvas.height);
		receiveImage({ width: canvas.width, height: canvas.height, data: image.data }, `scan-${pages.length + 1}.png`);
		stopCamera();
	};

	const loadFile = async (file?: File) => {
		if (!file) return;
		if (!file.type.startsWith('image/')) {
			setMessage('Choose an image file such as JPG, PNG, or WebP.');
			setIsError(true);
			return;
		}
		if (file.size > MAX_FILE_BYTES) {
			setMessage('The selected image exceeds the 30 MB limit.');
			setIsError(true);
			return;
		}
		setBusy(true);
		setMessage(`Loading ${file.name} locally…`);
		try {
			const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
			try {
				const scale = Math.min(1, MAX_CAPTURE_EDGE / Math.max(bitmap.width, bitmap.height));
				const width = Math.max(2, Math.round(bitmap.width * scale));
				const height = Math.max(2, Math.round(bitmap.height * scale));
				const canvas = document.createElement('canvas');
				canvas.width = width;
				canvas.height = height;
				const context = canvas.getContext('2d', { willReadFrequently: true });
				if (!context) throw new Error('Image processing canvas is unavailable in this browser.');
				context.drawImage(bitmap, 0, 0, width, height);
				const image = context.getImageData(0, 0, width, height);
				receiveImage({ width, height, data: image.data }, file.name);
			} finally {
				bitmap.close();
			}
		} catch (error) {
			setMessage(`Could not open the selected image. ${error instanceof Error ? error.message : 'Choose a supported image.'}`);
			setIsError(true);
		} finally {
			setBusy(false);
		}
	};

	const canvasPoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
		const canvas = event.currentTarget;
		const bounds = canvas.getBoundingClientRect();
		return {
			x: Math.max(0, Math.min(canvas.width - 1, (event.clientX - bounds.left) * canvas.width / bounds.width)),
			y: Math.max(0, Math.min(canvas.height - 1, (event.clientY - bounds.top) * canvas.height / bounds.height)),
		};
	};

	const startCornerDrag = (event: React.PointerEvent<HTMLCanvasElement>) => {
		if (!corners || !sourceImage) return;
		const point = canvasPoint(event);
		const nearest = corners.reduce((bestIndex, corner, index) => (
			Math.hypot(point.x - corner.x, point.y - corner.y) < Math.hypot(point.x - corners[bestIndex].x, point.y - corners[bestIndex].y)
				? index
				: bestIndex
		), 0);
		if (Math.hypot(point.x - corners[nearest].x, point.y - corners[nearest].y) > Math.max(sourceImage.width, sourceImage.height) * 0.06) return;
		dragCornerRef.current = nearest;
		event.currentTarget.setPointerCapture(event.pointerId);
	};

	const moveCorner = (event: React.PointerEvent<HTMLCanvasElement>) => {
		if (dragCornerRef.current === null || !corners) return;
		const point = canvasPoint(event);
		const next = corners.map((corner, index) => index === dragCornerRef.current ? point : corner) as ScanCorners;
		setCorners(next);
	};

	const finishCornerDrag = () => {
		dragCornerRef.current = null;
	};

	const correctPerspective = () => {
		if (!sourceImage || !corners) return;
		try {
			validateScanCorners(corners, sourceImage.width, sourceImage.height);
			const corrected = rectifyDocumentImage(sourceImage, corners);
			setScannedImage(enhanceScannedImage(corrected, enhancement));
			setIsError(false);
			setMessage('Perspective corrected. Choose an enhancement, then add this page to the scan.');
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Could not correct perspective. Adjust the page corners.');
			setIsError(true);
		}
	};

	const updateEnhancement = (mode: ScanEnhancement) => {
		setEnhancement(mode);
		if (!sourceImage || !corners) return;
		try {
			const corrected = rectifyDocumentImage(sourceImage, corners);
			setScannedImage(enhanceScannedImage(corrected, mode));
			setMessage('Scan enhancement updated.');
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Could not update the scan enhancement.');
			setIsError(true);
		}
	};

	const addPage = () => {
		if (!scannedImage) return;
		if (pages.length >= MAX_PAGES) {
			setMessage(`This scan supports up to ${MAX_PAGES} pages.`);
			setIsError(true);
			return;
		}
		setPages((current) => [...current, {
			id: nextPageIdRef.current++,
			name: sourceName,
			width: scannedImage.width,
			height: scannedImage.height,
			data: new Uint8ClampedArray(scannedImage.data),
		}]);
		setMessage(`Added page ${pages.length + 1} from ${sourceName}. Capture or upload another page, or create the PDF.`);
		setIsError(false);
	};

	const createPdf = async () => {
		if (pages.length === 0) {
			setMessage('Correct and add at least one page before creating a PDF.');
			setIsError(true);
			return;
		}
		setBusy(true);
		setIsError(false);
		try {
			const pdf = await PDFDocument.create();
			for (const [index, scanPage] of pages.entries()) {
				setMessage(`Adding scanned page ${index + 1} of ${pages.length} to PDF…`);
				const canvas = document.createElement('canvas');
				canvas.width = scanPage.width;
				canvas.height = scanPage.height;
				const context = canvas.getContext('2d');
				if (!context) throw new Error('Could not prepare the scanned page for PDF export.');
				context.putImageData(new ImageData(scanPage.data, scanPage.width, scanPage.height), 0, 0);
				const png = await canvasToPng(canvas);
				canvas.width = 0;
				canvas.height = 0;
				const image = await pdf.embedPng(png);
				const maxPageEdge = 14_400;
				const scale = Math.min(0.75, maxPageEdge / image.width, maxPageEdge / image.height);
				const width = image.width * scale;
				const height = image.height * scale;
				const page = pdf.addPage([width, height]);
				page.drawImage(image, { x: 0, y: 0, width, height });
			}
			const bytes = await pdf.save();
			triggerDownload(new Blob([bytes], { type: 'application/pdf' }), 'starmore-scanned-document.pdf');
			setMessage(`Created a ${pages.length}-page scanned PDF. Review the result before sharing.`);
		} catch (error) {
			setMessage(error instanceof Error ? `Could not create the scanned PDF. ${error.message}` : 'Could not create the scanned PDF.');
			setIsError(true);
		} finally {
			setBusy(false);
		}
	};

	return (
		<div>
			<div className="tool-actions">
				<button className="tool-button secondary" type="button" onClick={() => void openCamera()} disabled={cameraActive || busy}>Use camera</button>
				<label className="tool-button secondary" htmlFor="document-scanner-file">Upload image</label>
				<input id="document-scanner-file" className="image-file-input" type="file" accept="image/*" onChange={(event) => {
					const file = event.currentTarget.files?.[0];
					event.currentTarget.value = '';
					void loadFile(file);
				}} disabled={busy} />
			</div>
			{cameraActive && (
				<div className="document-camera">
					<video ref={videoRef} autoPlay playsInline muted aria-label="Live document camera preview" />
					<div className="tool-actions">
						<button className="tool-button" type="button" onClick={() => void captureImage()}>Capture page</button>
						<button className="tool-button secondary" type="button" onClick={stopCamera}>Close camera</button>
					</div>
				</div>
			)}
			{sourceImage && corners && (
				<>
					<p className="tool-message">Detected page corners for {sourceName}. Drag points 1–4 to refine the outline before correcting.</p>
					<div className="document-scan-source">
						<canvas ref={sourceCanvasRef} aria-label="Original document photo" />
						<canvas
							ref={overlayCanvasRef}
							className="document-scan-corners"
							aria-label="Drag the four numbered page corners"
							onPointerDown={startCornerDrag}
							onPointerMove={moveCorner}
							onPointerUp={finishCornerDrag}
							onPointerCancel={finishCornerDrag}
						/>
					</div>
					<div className="tool-actions">
						<button className="tool-button" type="button" onClick={correctPerspective}>Correct perspective</button>
						<div className="calc-field">
							<label htmlFor="document-scanner-enhancement">Enhancement</label>
							<select id="document-scanner-enhancement" value={enhancement} onChange={(event) => updateEnhancement(event.target.value as ScanEnhancement)}>
								<option value="color">Color</option>
								<option value="grayscale">Grayscale</option>
								<option value="black-white">Black and white</option>
							</select>
						</div>
					</div>
				</>
			)}
			{scannedImage && (
				<div className="document-scan-result">
					<h2>Corrected page preview</h2>
					<canvas ref={resultCanvasRef} id="document-scanner-result" aria-label="Perspective-corrected and enhanced page" />
					<div className="tool-actions">
						<button className="tool-button" type="button" onClick={addPage} disabled={pages.length >= MAX_PAGES}>Add page to scan ({pages.length}/{MAX_PAGES})</button>
					</div>
				</div>
			)}
			{pages.length > 0 && (
				<div className="document-scan-pages">
					<h2>Scanned pages ({pages.length})</h2>
					<ol>
						{pages.map((page, index) => (
							<li key={page.id}>
								<span>Page {index + 1} · {page.name} · {page.width} × {page.height} px</span>
								<button className="tool-button secondary" type="button" onClick={() => setPages((current) => current.filter((item) => item.id !== page.id))} disabled={busy}>Remove</button>
							</li>
						))}
					</ol>
					<div className="tool-actions">
						<button className="tool-button" type="button" onClick={() => void createPdf()} disabled={busy}>{busy ? 'Creating PDF…' : 'Create and download PDF'}</button>
					</div>
				</div>
			)}
			<p className={`tool-message${isError ? ' error' : ''}`} role="status">{message}</p>
			<p className="tool-message">Camera access requires permission and a secure context such as HTTPS or localhost. Edge detection is automatic but may need manual corner adjustment. Images are processed on your device and are not uploaded. The PDF contains page images and is not searchable; use OCR separately for selectable text.</p>
		</div>
	);
}
