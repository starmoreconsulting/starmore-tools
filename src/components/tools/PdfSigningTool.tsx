import { useRef, useState } from 'react';
import { readPdf, triggerDownload } from '../../engines/pdf';
import { normalizePdfSignatureOptions, selectedSignaturePages, type SignaturePosition } from '../../engines/pdf-signature';

type SignatureMode = 'draw' | 'type' | 'upload';

async function canvasPng(canvas: HTMLCanvasElement): Promise<Uint8Array> {
	const blob = await new Promise<Blob>((resolve, reject) => {
		canvas.toBlob((result) => result ? resolve(result) : reject(new Error('Could not create the signature image.')), 'image/png');
	});
	return new Uint8Array(await blob.arrayBuffer());
}

function typedSignaturePng(text: string): Promise<Uint8Array> {
	const canvas = document.createElement('canvas');
	canvas.width = 1000;
	canvas.height = 240;
	const context = canvas.getContext('2d');
	if (!context) throw new Error('Signature canvas is unavailable in this browser.');
	context.font = 'italic 116px cursive';
	context.textAlign = 'center';
	context.textBaseline = 'middle';
	context.fillStyle = '#202020';
	context.fillText(text, canvas.width / 2, canvas.height / 2, canvas.width - 40);
	return canvasPng(canvas);
}

async function uploadedSignaturePng(file: File): Promise<Uint8Array> {
	if (file.size > 10 * 1024 * 1024) throw new Error('Signature images must be 10 MB or smaller.');
	const bitmap = await createImageBitmap(file);
	try {
		if (bitmap.width > 6000 || bitmap.height > 6000) throw new Error('Signature images must be no larger than 6000 × 6000 pixels.');
		const canvas = document.createElement('canvas');
		canvas.width = bitmap.width;
		canvas.height = bitmap.height;
		const context = canvas.getContext('2d');
		if (!context) throw new Error('Signature canvas is unavailable in this browser.');
		context.drawImage(bitmap, 0, 0);
		return await canvasPng(canvas);
	} finally {
		bitmap.close();
	}
}

export default function PdfSigningTool() {
	const [file, setFile] = useState<File | null>(null);
	const [mode, setMode] = useState<SignatureMode>('draw');
	const [typedName, setTypedName] = useState('');
	const [signatureFile, setSignatureFile] = useState<File | null>(null);
	const [hasInk, setHasInk] = useState(false);
	const [ranges, setRanges] = useState('1');
	const [allPages, setAllPages] = useState(false);
	const [position, setPosition] = useState<SignaturePosition>('bottom-right');
	const [width, setWidth] = useState(150);
	const [margin, setMargin] = useState(36);
	const [busy, setBusy] = useState(false);
	const [message, setMessage] = useState('Choose a PDF and create or upload a visible signature.');
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const strokeRef = useRef(false);

	const signatureImage = async () => {
		if (mode === 'type') {
			const name = typedName.trim();
			if (!name) throw new Error('Enter the name to use as your signature.');
			return typedSignaturePng(name);
		}
		if (mode === 'upload') {
			if (!signatureFile) throw new Error('Choose a PNG or JPEG signature image.');
			return uploadedSignaturePng(signatureFile);
		}
		if (!canvasRef.current || !hasInk) throw new Error('Draw your signature in the signature box first.');
		return canvasPng(canvasRef.current);
	};

	const signPdf = async () => {
		if (!file) { setMessage('Choose a PDF before adding a signature.'); return; }
		let options;
		try {
			options = normalizePdfSignatureOptions(position, width, margin);
			if (mode === 'draw' && !hasInk) throw new Error('Draw your signature in the signature box first.');
			if (mode === 'type' && !typedName.trim()) throw new Error('Enter the name to use as your signature.');
			if (mode === 'upload' && !signatureFile) throw new Error('Choose a PNG or JPEG signature image.');
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Check the signature settings.');
			return;
		}

		setBusy(true);
		setMessage('Adding the visible signature locally…');
		try {
			const source = await readPdf(file);
			const pages = selectedSignaturePages(allPages, ranges, source.getPageCount());
			const signatureBytes = await signatureImage();
			const image = await source.embedPng(signatureBytes);
			for (const pageIndex of pages) {
				const page = source.getPage(pageIndex);
				const { width: pageWidth, height: pageHeight } = page.getSize();
				const drawWidth = Math.min(options.width, pageWidth - options.margin * 2);
				if (drawWidth <= 0) throw new Error(`The selected margin is too large for page ${pageIndex + 1}.`);
				const drawHeight = drawWidth * image.height / image.width;
				if (drawHeight > pageHeight - options.margin * 2) throw new Error(`The signature image is too tall for page ${pageIndex + 1}. Choose a wider or shorter signature image.`);
				let x = options.margin;
				if (options.position === 'bottom-center') x = (pageWidth - drawWidth) / 2;
				if (options.position === 'bottom-right') x = pageWidth - drawWidth - options.margin;
				page.drawImage(image, { x, y: options.margin, width: drawWidth, height: drawHeight });
			}
			const bytes = await source.save();
			const blob = new Blob([bytes], { type: 'application/pdf' });
			triggerDownload(blob, file.name.replace(/\.pdf$/i, '') + '-signed.pdf');
			setMessage(`Added a visible signature to ${pages.length} page${pages.length === 1 ? '' : 's'}. This is not a certificate-based digital signature.`);
		} catch (error) {
			setMessage(error instanceof Error ? `Could not sign the PDF. ${error.message}` : 'Could not sign the PDF. It may be damaged or password-protected.');
		} finally {
			setBusy(false);
		}
	};

	const pointerPosition = (event: React.PointerEvent<HTMLCanvasElement>) => {
		const canvas = event.currentTarget;
		const bounds = canvas.getBoundingClientRect();
		return {
			x: (event.clientX - bounds.left) * canvas.width / bounds.width,
			y: (event.clientY - bounds.top) * canvas.height / bounds.height,
		};
	};

	const startStroke = (event: React.PointerEvent<HTMLCanvasElement>) => {
		const canvas = event.currentTarget;
		const context = canvas.getContext('2d');
		if (!context) return;
		canvas.setPointerCapture(event.pointerId);
		const point = pointerPosition(event);
		context.beginPath();
		context.moveTo(point.x, point.y);
		context.lineWidth = 5;
		context.lineCap = 'round';
		context.lineJoin = 'round';
		context.strokeStyle = '#202020';
		context.beginPath();
		context.arc(point.x, point.y, context.lineWidth / 2, 0, Math.PI * 2);
		context.fill();
		context.beginPath();
		context.moveTo(point.x, point.y);
		strokeRef.current = true;
		setHasInk(true);
	};

	const continueStroke = (event: React.PointerEvent<HTMLCanvasElement>) => {
		if (!strokeRef.current) return;
		const context = event.currentTarget.getContext('2d');
		if (!context) return;
		const point = pointerPosition(event);
		context.lineTo(point.x, point.y);
		context.stroke();
	};

	const endStroke = () => { strokeRef.current = false; };

	const clearSignature = () => {
		const canvas = canvasRef.current;
		canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
		setHasInk(false);
	};

	return (
		<div>
			<div className="tool-control"><label htmlFor="pdf-sign-file">PDF file</label><input className="image-file-input" id="pdf-sign-file" type="file" accept="application/pdf,.pdf" onChange={(event) => { setFile(event.target.files?.[0] ?? null); setMessage(event.target.files?.[0] ? 'PDF selected. Add a visible signature.' : 'Choose a PDF file.'); }} /></div>
			<div className="calc-field"><label htmlFor="pdf-sign-mode">Signature source</label><select id="pdf-sign-mode" value={mode} onChange={(event) => setMode(event.target.value as SignatureMode)}><option value="draw">Draw signature</option><option value="type">Type a name</option><option value="upload">Upload signature image</option></select></div>
			{mode === 'draw' && <div className="calc-field"><label htmlFor="pdf-sign-canvas">Draw your signature</label><canvas id="pdf-sign-canvas" ref={canvasRef} width={800} height={220} aria-label="Draw signature here" onPointerDown={startStroke} onPointerMove={continueStroke} onPointerUp={endStroke} onPointerCancel={endStroke} style={{ display: 'block', width: '100%', maxWidth: 640, height: 'auto', border: '1px solid #c9c7bc', borderRadius: 8, touchAction: 'none', background: '#fff' }} /><button className="tool-button secondary" type="button" onClick={clearSignature}>Clear signature</button></div>}
			{mode === 'type' && <div className="calc-field"><label htmlFor="pdf-sign-name">Name to sign</label><input id="pdf-sign-name" type="text" maxLength={100} value={typedName} onChange={(event) => setTypedName(event.target.value)} placeholder="Enter your name" /></div>}
			{mode === 'upload' && <div className="tool-control"><label htmlFor="pdf-sign-image">Signature image (PNG or JPEG)</label><input className="image-file-input" id="pdf-sign-image" type="file" accept="image/png,image/jpeg,.png,.jpg,.jpeg" onChange={(event) => setSignatureFile(event.target.files?.[0] ?? null)} /></div>}
			<div className="tool-choice-row" role="group" aria-label="Signature page scope"><label className="tool-choice"><input type="checkbox" checked={allPages} onChange={(event) => setAllPages(event.target.checked)} /><span>Sign every page</span></label></div>
			{!allPages && <div className="calc-field"><label htmlFor="pdf-sign-pages">Pages to sign (e.g. 1, 3-4)</label><input id="pdf-sign-pages" type="text" value={ranges} onChange={(event) => setRanges(event.target.value)} placeholder="1, 3-4" /></div>}
			<div className="calc-fields">
				<div className="calc-field"><label htmlFor="pdf-sign-position">Position on page</label><select id="pdf-sign-position" value={position} onChange={(event) => setPosition(event.target.value as SignaturePosition)}><option value="bottom-left">Bottom left</option><option value="bottom-center">Bottom center</option><option value="bottom-right">Bottom right</option></select></div>
				<div className="calc-field"><label htmlFor="pdf-sign-width">Signature width (points)</label><input id="pdf-sign-width" type="number" min="60" max="360" value={width} onChange={(event) => setWidth(Number(event.target.value))} /></div>
				<div className="calc-field"><label htmlFor="pdf-sign-margin">Bottom/side margin (points)</label><input id="pdf-sign-margin" type="number" min="0" max="144" value={margin} onChange={(event) => setMargin(Number(event.target.value))} /></div>
			</div>
			<div className="tool-actions"><button className="tool-button" type="button" disabled={!file || busy} onClick={() => void signPdf()}>{busy ? 'Signing locally…' : 'Add signature and download PDF'}</button></div>
			<p className="tool-message" role="status">{message}</p>
			<p className="privacy-note">This adds a visible signature image to the PDF; it does not create a certificate-based digital signature or verify identity. The PDF is processed locally and is not uploaded.</p>
		</div>
	);
}
