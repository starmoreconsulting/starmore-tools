import { useEffect, useState } from 'react';
import { canvasToBlob, getImageExtension, getSupportedImageType, loadImage, MAX_IMAGE_PIXELS, type SupportedImageType } from '../../engines/image';

type OutputFormat = 'image/jpeg' | 'image/png' | 'image/webp';

function downloadBlob(blob: Blob, type: OutputFormat) {
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = `starmore-converted.${getImageExtension(type)}`;
	link.click();
	window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function ImageFormatConverter() {
	const [file, setFile] = useState<File | null>(null);
	const [format, setFormat] = useState<OutputFormat>('image/png');
	const [quality, setQuality] = useState(90);
	const [converted, setConverted] = useState<Blob | null>(null);
	const [previewUrl, setPreviewUrl] = useState('');
	const [message, setMessage] = useState('Choose an image. Conversion runs locally on your device.');

	useEffect(() => {
		if (!converted) {
			setPreviewUrl('');
			return;
		}
		const url = URL.createObjectURL(converted);
		setPreviewUrl(url);
		return () => URL.revokeObjectURL(url);
	}, [converted]);

	const convert = async () => {
		if (!file) {
			setMessage('Choose a JPG, PNG, or WebP image first.');
			return;
		}
		if (!getSupportedImageType(file)) {
			setMessage('Choose a JPG, PNG, or WebP image file.');
			return;
		}
		setConverted(null);
		setMessage('Converting locally in your browser…');
		try {
			const image = await loadImage(file);
			if (image.naturalWidth * image.naturalHeight > MAX_IMAGE_PIXELS) throw new Error('This image is too large to process safely in the browser.');
			const canvas = document.createElement('canvas');
			canvas.width = image.naturalWidth;
			canvas.height = image.naturalHeight;
			const context = canvas.getContext('2d');
			if (!context) throw new Error('Your browser could not prepare the image canvas.');
			if (format === 'image/jpeg') {
				context.fillStyle = '#ffffff';
				context.fillRect(0, 0, canvas.width, canvas.height);
			}
			context.drawImage(image, 0, 0);
			const blob = await canvasToBlob(canvas, format, format === 'image/png' ? undefined : quality / 100);
			canvas.width = 0;
			canvas.height = 0;
			const actualFormat = (blob.type in { 'image/jpeg': true, 'image/png': true, 'image/webp': true } ? blob.type : format) as SupportedImageType;
			setFormat(actualFormat);
			setConverted(blob);
			setMessage(`Converted to ${getImageExtension(actualFormat).toUpperCase()} on your device.${actualFormat === 'image/jpeg' && getSupportedImageType(file) !== 'image/jpeg' ? ' Transparent areas were filled white.' : ''}`);
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Could not convert this image.');
		}
	};

	return (
		<div>
			<div className="tool-control">
				<label htmlFor="format-converter-file">Choose image</label>
				<input className="image-file-input" id="format-converter-file" type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" onChange={(event) => {
					setFile(event.currentTarget.files?.[0] ?? null);
					setConverted(null);
					setMessage('Image selected. Choose an output format and convert.');
				}} />
			</div>
			<div className="calc-fields" style={{ marginTop: 15 }}>
				<div className="calc-field">
					<label htmlFor="format-converter-output">Convert to</label>
					<select id="format-converter-output" value={format} onChange={(event) => { setFormat(event.target.value as OutputFormat); setConverted(null); }}>
						<option value="image/jpeg">JPG</option>
						<option value="image/png">PNG</option>
						<option value="image/webp">WebP</option>
					</select>
				</div>
				<div className="tool-control">
					<label htmlFor="format-converter-quality">Quality: {quality}% (JPG / WebP)</label>
					<input id="format-converter-quality" type="range" min="10" max="100" value={quality} onChange={(event) => { setQuality(Number(event.target.value)); setConverted(null); }} />
				</div>
			</div>
			<p className="privacy-note">JPG does not support transparency. When converting transparent images to JPG, transparent areas are filled with white.</p>
			<div className="tool-actions">
				<button className="tool-button" type="button" disabled={!file} onClick={convert}>Convert image</button>
				<button className="tool-button secondary" type="button" disabled={!converted} onClick={() => converted && downloadBlob(converted, format)}>Download image</button>
			</div>
			{previewUrl && <div className="tool-preview"><img src={previewUrl} alt="Converted image preview" /></div>}
			<p className="tool-message" role="status">{message}</p>
			<p className="privacy-note">Your image files never leave your device. Conversion uses the Canvas API in this browser.</p>
		</div>
	);
}
