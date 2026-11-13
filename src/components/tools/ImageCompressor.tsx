import { useEffect, useRef, useState } from 'react';
import { canvasToBlob, formatFileSize, getImageExtension, getSupportedImageType, loadImage, MAX_IMAGE_PIXELS, type SupportedImageType } from '../../engines/image';

function downloadBlob(blob: Blob, type: SupportedImageType) {
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = `starmore-compressed.${getImageExtension(type)}`;
	link.click();
	window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function ImageCompressor() {
	const [file, setFile] = useState<File | null>(null);
	const [quality, setQuality] = useState(80);
	const [compressed, setCompressed] = useState<Blob | null>(null);
	const [inputUrl, setInputUrl] = useState('');
	const [outputUrl, setOutputUrl] = useState('');
	const [message, setMessage] = useState('Choose a JPG, PNG, or WebP image to begin.');
	const operation = useRef(0);

	useEffect(() => {
		if (!file) {
			setInputUrl('');
			return;
		}
		const url = URL.createObjectURL(file);
		setInputUrl(url);
		return () => URL.revokeObjectURL(url);
	}, [file]);

	useEffect(() => {
		if (!compressed) {
			setOutputUrl('');
			return;
		}
		const url = URL.createObjectURL(compressed);
		setOutputUrl(url);
		return () => URL.revokeObjectURL(url);
	}, [compressed]);

	const chooseFile = (selected: File | undefined) => {
		operation.current += 1;
		setCompressed(null);
		if (!selected) {
			setFile(null);
			setMessage('Choose a JPG, PNG, or WebP image to begin.');
			return;
		}
		if (!getSupportedImageType(selected)) {
			setFile(null);
			setMessage('Choose a JPG, PNG, or WebP image file.');
			return;
		}
		setFile(selected);
		setMessage('Image selected. Adjust quality, then compress it.');
	};

	const compress = async () => {
		if (!file) {
			setMessage('Choose an image before compressing.');
			return;
		}
		const type = getSupportedImageType(file);
		if (!type) {
			setMessage('Choose a supported JPG, PNG, or WebP image.');
			return;
		}

		const operationId = ++operation.current;
		setCompressed(null);
		setMessage('Compressing locally in your browser…');
		try {
			const image = await loadImage(file);
			if (operationId !== operation.current) return;
			const pixels = image.naturalWidth * image.naturalHeight;
			if (pixels <= 0 || pixels > MAX_IMAGE_PIXELS) throw new Error('This image is too large to process safely in the browser.');

			const canvas = document.createElement('canvas');
			canvas.width = image.naturalWidth;
			canvas.height = image.naturalHeight;
			const context = canvas.getContext('2d');
			if (!context) throw new Error('Your browser could not prepare the image canvas.');
			if (type === 'image/jpeg') {
				context.fillStyle = '#ffffff';
				context.fillRect(0, 0, canvas.width, canvas.height);
			}
			context.drawImage(image, 0, 0);
			const blob = await canvasToBlob(canvas, type, quality / 100);
			canvas.width = 0;
			canvas.height = 0;
			if (operationId !== operation.current) return;
			const reduced = blob.size < file.size;
			setCompressed(reduced ? blob : file);
			setMessage(reduced
				? type === 'image/png'
					? 'The PNG was reduced. Browser PNG encoding does not use the quality setting.'
					: 'Compression complete. The original image remains unchanged.'
				: type === 'image/png'
					? 'Re-encoding would not reduce the file size, so the original PNG is kept. Browser PNG encoding does not use the quality setting.'
					: 'Re-encoding would not reduce the file size, so the original image is kept. Try a lower quality setting.');
		} catch (error) {
			if (operationId === operation.current) {
				setMessage(error instanceof Error ? error.message : 'Could not compress this image.');
			}
		}
	};

	return (
		<div>
			<div className="tool-control">
				<label htmlFor="compress-file">Choose image</label>
				<input className="image-file-input" id="compress-file" type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" onChange={(event) => chooseFile(event.currentTarget.files?.[0])} />
			</div>
			<div className="tool-control" style={{ marginTop: 16 }}>
				<label htmlFor="compress-quality">Quality: {quality}%</label>
				<input id="compress-quality" type="range" min="10" max="100" step="1" value={quality} onChange={(event) => {
					operation.current += 1;
					setQuality(Number(event.target.value));
					setCompressed(null);
					setMessage('Quality updated. Compress the image to create a new result.');
				}} />
				<p className="inline-note">Quality affects JPG and WebP output. PNG uses lossless browser encoding.</p>
			</div>
			<div className="tool-actions">
				<button className="tool-button" type="button" onClick={compress} disabled={!file}>Compress image</button>
				<button className="tool-button secondary" type="button" disabled={!compressed || !file} onClick={() => {
					const type = file ? getSupportedImageType(file) : null;
					if (compressed && type) downloadBlob(compressed, type);
				}}>Download compressed image</button>
			</div>
			{inputUrl && <div className="tool-preview"><img src={inputUrl} alt="Selected image before compression" /></div>}
			<div className="calc-result-grid">
				<div className="calc-result">
					<span className="calc-label">BEFORE</span>
					<strong>{file ? formatFileSize(file.size) : '—'}</strong>
				</div>
				<div className="calc-result featured">
					<span className="calc-label">AFTER</span>
					<strong>{compressed ? formatFileSize(compressed.size) : '—'}</strong>
				</div>
			</div>
			{outputUrl && <div className="tool-preview"><img src={outputUrl} alt="Compressed image preview" /></div>}
			<p className="tool-message" role="status">{message}</p>
			<p className="privacy-note">Your images never leave your device. Selection, preview, and compression run locally in this browser.</p>
		</div>
	);
}
