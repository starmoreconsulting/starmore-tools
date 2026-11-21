import { useRef, useState } from 'react';
import Tesseract from 'tesseract.js';

const recognize = Tesseract.recognize;

export default function ImageToTextOcr() {
	const [file, setFile] = useState<File | null>(null);
	const [previewUrl, setPreviewUrl] = useState('');
	const [text, setText] = useState('');
	const [progress, setProgress] = useState(0);
	const [busy, setBusy] = useState(false);
	const [message, setMessage] = useState('Choose an image containing printed English text.');
	const abortRef = useRef(false);

	const chooseFile = (selected?: File) => {
		setText(''); setProgress(0); setFile(selected || null);
		if (!selected) { setPreviewUrl(''); setMessage('Choose an image containing printed English text.'); return; }
		if (previewUrl) URL.revokeObjectURL(previewUrl);
		setPreviewUrl(URL.createObjectURL(selected));
		setMessage(`Image selected: ${selected.name}. Ready to extract text.`);
	};

	const extract = async () => {
		if (!file) { setMessage('Choose an image before extracting text.'); return; }
		setBusy(true); setProgress(0); abortRef.current = false; setText(''); setMessage('Preparing local OCR engine and language data…');
		try {
			const result = await recognize(file, 'eng', {
				logger: (update) => {
					if (typeof update.progress === 'number') setProgress(Math.round(update.progress * 100));
					if (update.status) setMessage(update.status === 'recognizing text' ? 'Recognizing text…' : `OCR: ${update.status}`);
				},
			} as never);
			if (abortRef.current) return;
			setText(result.data.text.trim());
			setProgress(100);
			setMessage(result.data.text.trim() ? 'Text extraction complete. Review and edit the result.' : 'No readable text was detected. Try a sharper, higher-resolution image.');
		} catch (error) {
			setMessage(error instanceof Error ? `OCR could not be completed. ${error.message}` : 'OCR could not be completed. Check your connection and try again.');
		} finally { setBusy(false); }
	};

	const download = () => {
		const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a'); link.href = url; link.download = 'extracted-text.txt'; link.click(); URL.revokeObjectURL(url);
	};

	return (
		<div>
			<div className="tool-control"><label htmlFor="ocr-file">Choose image</label><input id="ocr-file" type="file" accept="image/jpeg,image/png,image/webp,image/bmp" onChange={(event) => chooseFile(event.target.files?.[0])} /></div>
			{previewUrl && <img className="ocr-preview" src={previewUrl} alt="Image prepared for OCR" />}
			<div className="tool-actions"><button className="tool-button" type="button" onClick={() => void extract()} disabled={!file || busy}>{busy ? `Extracting… ${progress}%` : 'Extract text'}</button>{text && <button className="tool-button secondary" type="button" onClick={download}>Download text</button>}</div>
			<label htmlFor="ocr-output">Extracted text</label>
			<textarea id="ocr-output" value={text} onChange={(event) => setText(event.target.value)} placeholder="Extracted text will appear here..." />
			<p className="tool-message" role="status">{message}</p>
		</div>
	);
}
