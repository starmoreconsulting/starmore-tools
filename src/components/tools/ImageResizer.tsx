import { useEffect, useRef, useState } from 'react';
import { canvasToBlob, getImageExtension, getSupportedImageType, loadImage, MAX_IMAGE_PIXELS, type SupportedImageType } from '../../engines/image';

function downloadBlob(blob: Blob, type: SupportedImageType) {
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = `starmore-resized.${getImageExtension(type)}`;
	link.click();
	window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function ImageResizer() {
	const [file, setFile] = useState<File | null>(null);
	const [sourceWidth, setSourceWidth] = useState(0);
	const [sourceHeight, setSourceHeight] = useState(0);
	const [width, setWidth] = useState('');
	const [height, setHeight] = useState('');
	const [percentage, setPercentage] = useState('100');
	const [lockRatio, setLockRatio] = useState(true);
	const [resized, setResized] = useState<Blob | null>(null);
	const [inputUrl, setInputUrl] = useState('');
	const [outputUrl, setOutputUrl] = useState('');
	const [outputDimensions, setOutputDimensions] = useState('');
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
		if (!resized) {
			setOutputUrl('');
			return;
		}
		const url = URL.createObjectURL(resized);
		setOutputUrl(url);
		return () => URL.revokeObjectURL(url);
	}, [resized]);

	const chooseFile = async (selected: File | undefined) => {
		const operationId = ++operation.current;
		setFile(null);
		setResized(null);
		setOutputDimensions('');
		if (!selected) {
			setMessage('Choose a JPG, PNG, or WebP image to begin.');
			return;
		}
		if (!getSupportedImageType(selected)) {
			setMessage('Choose a JPG, PNG, or WebP image file.');
			return;
		}
		try {
			const image = await loadImage(selected);
			if (operationId !== operation.current) return;
			setFile(selected);
			setSourceWidth(image.naturalWidth);
			setSourceHeight(image.naturalHeight);
			setWidth(String(image.naturalWidth));
			setHeight(String(image.naturalHeight));
			setMessage('Image selected. Set dimensions or use a percentage, then resize.');
		} catch (error) {
			if (operationId === operation.current) setMessage(error instanceof Error ? error.message : 'Could not open this image.');
		}
	};

	const setWidthValue = (value: string) => {
		operation.current += 1;
		setWidth(value);
		const numericWidth = Number(value);
		if (lockRatio && sourceWidth > 0 && Number.isFinite(numericWidth) && numericWidth > 0) {
			setHeight(String(Math.max(1, Math.round(numericWidth * sourceHeight / sourceWidth))));
		}
		setResized(null);
	};

	const setHeightValue = (value: string) => {
		operation.current += 1;
		setHeight(value);
		const numericHeight = Number(value);
		if (lockRatio && sourceHeight > 0 && Number.isFinite(numericHeight) && numericHeight > 0) {
			setWidth(String(Math.max(1, Math.round(numericHeight * sourceWidth / sourceHeight))));
		}
		setResized(null);
	};

	const applyPercentage = () => {
		operation.current += 1;
		const value = Number(percentage);
		if (!Number.isFinite(value) || value <= 0 || value > 500 || sourceWidth <= 0 || sourceHeight <= 0) {
			setMessage('Enter a resize percentage greater than 0% and no more than 500%.');
			return;
		}
		setWidth(String(Math.max(1, Math.round(sourceWidth * value / 100))));
		setHeight(String(Math.max(1, Math.round(sourceHeight * value / 100))));
		setResized(null);
		setMessage(`Dimensions set to ${value}% of the original size.`);
	};

	const resize = async () => {
		const targetWidth = Number(width);
		const targetHeight = Number(height);
		if (!file) {
			setMessage('Choose an image before resizing.');
			return;
		}
		if (!Number.isSafeInteger(targetWidth) || !Number.isSafeInteger(targetHeight)
			|| targetWidth <= 0 || targetHeight <= 0) {
			setMessage('Enter positive whole-number dimensions.');
			return;
		}
		if (targetWidth * targetHeight > MAX_IMAGE_PIXELS) {
			setMessage('The requested dimensions are too large to process safely in the browser.');
			return;
		}
		const type = getSupportedImageType(file);
		if (!type) {
			setMessage('Choose a supported JPG, PNG, or WebP image.');
			return;
		}

		const operationId = ++operation.current;
		setResized(null);
		setMessage('Resizing locally in your browser…');
		try {
			const image = await loadImage(file);
			if (operationId !== operation.current) return;
			const canvas = document.createElement('canvas');
			canvas.width = targetWidth;
			canvas.height = targetHeight;
			const context = canvas.getContext('2d');
			if (!context) throw new Error('Your browser could not prepare the image canvas.');
			context.drawImage(image, 0, 0, targetWidth, targetHeight);
			const blob = await canvasToBlob(canvas, type);
			canvas.width = 0;
			canvas.height = 0;
			if (operationId !== operation.current) return;
			setResized(blob);
			setOutputDimensions(`${targetWidth} × ${targetHeight}px`);
			setMessage('Resize complete. Your original image remains unchanged.');
		} catch (error) {
			if (operationId === operation.current) setMessage(error instanceof Error ? error.message : 'Could not resize this image.');
		}
	};

	const onLockChange = (checked: boolean) => {
		operation.current += 1;
		setLockRatio(checked);
		if (checked && sourceWidth > 0 && sourceHeight > 0) {
			const numericWidth = Number(width);
			if (Number.isFinite(numericWidth) && numericWidth > 0) setHeight(String(Math.max(1, Math.round(numericWidth * sourceHeight / sourceWidth))));
		}
		setResized(null);
	};

	return (
		<div>
			<div className="tool-control">
				<label htmlFor="resize-file">Choose image</label>
				<input className="image-file-input" id="resize-file" type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" onChange={(event) => { void chooseFile(event.currentTarget.files?.[0]); }} />
			</div>
			{sourceWidth > 0 && sourceHeight > 0 && <p className="inline-note">Original size: {sourceWidth} × {sourceHeight}px</p>}
			<div className="calc-fields" style={{ marginTop: 15 }}>
				<div className="calc-field">
					<label htmlFor="resize-width">Width (px)</label>
					<input id="resize-width" type="number" min="1" step="1" inputMode="numeric" value={width} onChange={(event) => setWidthValue(event.target.value)} />
				</div>
				<div className="calc-field">
					<label htmlFor="resize-height">Height (px)</label>
					<input id="resize-height" type="number" min="1" step="1" inputMode="numeric" value={height} onChange={(event) => setHeightValue(event.target.value)} />
				</div>
			</div>
			<label className="tool-choice" style={{ marginTop: 13 }}>
				<input type="checkbox" checked={lockRatio} onChange={(event) => onLockChange(event.target.checked)} />
				<span>Lock aspect ratio</span>
			</label>
			<div className="calc-fields" style={{ marginTop: 15 }}>
				<div className="calc-field">
					<label htmlFor="resize-percentage">Resize percentage</label>
					<div className="calc-input-suffix">
						<input id="resize-percentage" type="number" min="1" max="500" step="any" inputMode="decimal" value={percentage} onChange={(event) => setPercentage(event.target.value)} />
						<span>%</span>
					</div>
				</div>
				<div className="tool-actions" style={{ alignItems: 'end', marginTop: 0 }}>
					<button className="tool-button secondary" type="button" onClick={applyPercentage} disabled={!file}>Apply percentage</button>
				</div>
			</div>
			<div className="tool-actions">
				<button className="tool-button" type="button" onClick={resize} disabled={!file}>Resize image</button>
				<button className="tool-button secondary" type="button" disabled={!resized || !file} onClick={() => {
					const type = file ? getSupportedImageType(file) : null;
					if (resized && type) downloadBlob(resized, type);
				}}>Download resized image</button>
			</div>
			{inputUrl && <div className="tool-preview"><img src={inputUrl} alt="Original image" /></div>}
			{outputUrl && <div className="tool-preview"><img src={outputUrl} alt={`Resized image${outputDimensions ? `, ${outputDimensions}` : ''}`} /></div>}
			<p className="tool-message" role="status">{message}</p>
			<p className="privacy-note">Your images never leave your device. Resizing runs locally in this browser.</p>
		</div>
	);
}
