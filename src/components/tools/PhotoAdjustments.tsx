import { useEffect, useRef, useState } from 'react';
import {
	canvasToBlob,
	canvasToImageData,
	createCanvas,
	decodeImageFile,
	downloadImage,
	estimateImageBytes,
	exportImage,
	formatImageBytes,
	runImageWorker,
	type DecodedImage,
	type ImageOutputType,
} from '../../engines/image/toolkit';

type Adjustments = {
	brightness: number;
	contrast: number;
	exposure: number;
	saturation: number;
	vibrance: number;
	temperature: number;
	tint: number;
	highlights: number;
	shadows: number;
	autoStretch: boolean;
};

const defaults: Adjustments = {
	brightness: 0, contrast: 0, exposure: 0, saturation: 0, vibrance: 0,
	temperature: 0, tint: 0, highlights: 0, shadows: 0, autoStretch: false,
};

function makeHistogram(data: Uint8ClampedArray): number[] {
	const histogram = new Array<number>(256).fill(0);
	for (let index = 0; index < data.length; index += 4) {
		const luma = Math.round(0.2126 * data[index] + 0.7152 * data[index + 1] + 0.0722 * data[index + 2]);
		histogram[luma] += 1;
	}
	return histogram;
}

export default function PhotoAdjustments({ preset }: { preset?: 'brightness-contrast' }) {
	const presetDefaults: Adjustments = preset === 'brightness-contrast'
		? { ...defaults, brightness: 14, contrast: 12 }
		: defaults;
	const [file, setFile] = useState<File | null>(null);
	const [source, setSource] = useState<DecodedImage | null>(null);
	const [inputUrl, setInputUrl] = useState('');
	const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
	const [previewUrl, setPreviewUrl] = useState('');
	const [result, setResult] = useState<Blob | null>(null);
	const [resultUrl, setResultUrl] = useState('');
	const [adjustments, setAdjustments] = useState<Adjustments>(presetDefaults);
	const [histogram, setHistogram] = useState<number[]>([]);
	const [format, setFormat] = useState<ImageOutputType>('image/png');
	const [quality, setQuality] = useState(90);
	const [compare, setCompare] = useState(50);
	const [busy, setBusy] = useState(false);
	const [progress, setProgress] = useState(0);
	const [message, setMessage] = useState('Choose an image. Adjustments stay entirely on your device.');
	const previewCanvas = useRef<HTMLCanvasElement>(null);
	const histogramCanvas = useRef<HTMLCanvasElement>(null);

	useEffect(() => () => source?.bitmap.close(), [source]);
	useEffect(() => {
		if (!file) { setInputUrl(''); return; }
		const url = URL.createObjectURL(file);
		setInputUrl(url);
		return () => URL.revokeObjectURL(url);
	}, [file]);
	useEffect(() => {
		if (!previewBlob) { setPreviewUrl(''); return; }
		const url = URL.createObjectURL(previewBlob);
		setPreviewUrl(url);
		return () => URL.revokeObjectURL(url);
	}, [previewBlob]);
	useEffect(() => {
		if (!result) { setResultUrl(''); return; }
		const url = URL.createObjectURL(result);
		setResultUrl(url);
		return () => URL.revokeObjectURL(url);
	}, [result]);
	useEffect(() => {
		if (!source || !previewCanvas.current) return;
		const scale = Math.min(1, 720 / Math.max(source.width, source.height));
		const width = Math.max(1, Math.round(source.width * scale));
		const height = Math.max(1, Math.round(source.height * scale));
		const canvas = previewCanvas.current;
		canvas.width = width;
		canvas.height = height;
		const context = canvas.getContext('2d', { willReadFrequently: true });
		if (!context) { setMessage('Your browser could not prepare the preview.'); return; }
		context.drawImage(source.bitmap, 0, 0, width, height);
		setResult(null);
		setMessage('Preview ready. Changes below update a smaller copy; full resolution is processed on download.');
	}, [source]);
	useEffect(() => {
		const canvas = histogramCanvas.current;
		if (!canvas) return;
		const context = canvas.getContext('2d');
		if (!context) return;
		canvas.width = 256;
		canvas.height = 72;
		context.clearRect(0, 0, 256, 72);
		context.fillStyle = '#f3f5ed';
		context.fillRect(0, 0, 256, 72);
		const peak = Math.max(1, ...histogram);
		context.fillStyle = '#55744d';
		for (let value = 0; value < 256; value += 1) {
			const barHeight = histogram[value] / peak * 68;
			context.fillRect(value, 72 - barHeight, 1, barHeight);
		}
	}, [histogram]);

	useEffect(() => {
		if (!source || !previewCanvas.current) return;
		let cancelled = false;
		const timer = window.setTimeout(async () => {
			try {
				const imageData = await canvasToImageData(previewCanvas.current!);
				const processed = await runImageWorker({
					type: 'adjust',
					data: new Uint8ClampedArray(imageData.data),
					width: imageData.width,
					height: imageData.height,
					adjustments,
				});
				if (cancelled) return;
				const canvas = createCanvas(processed.width, processed.height) as HTMLCanvasElement;
				const context = canvas.getContext('2d');
				if (!context) throw new Error('Your browser could not prepare the adjustment preview.');
				context.putImageData(new ImageData(processed.data, processed.width, processed.height), 0, 0);
				const blob = await canvasToBlob(canvas, 'image/png');
				canvas.width = 0;
				canvas.height = 0;
				if (cancelled) return;
				setPreviewBlob(blob);
				setHistogram(makeHistogram(processed.data));
			} catch (error) {
				if (!cancelled) setMessage(error instanceof Error ? error.message : 'Could not refresh the adjustment preview.');
			}
		}, 160);
		return () => { cancelled = true; window.clearTimeout(timer); };
	}, [source, adjustments]);

	const chooseFile = async (selected?: File) => {
		setSource(null);
		setFile(null);
		setPreviewBlob(null);
		setResult(null);
		setHistogram([]);
		if (!selected) return;
		try {
			const decoded = await decodeImageFile(selected);
			setSource(decoded);
			setFile(selected);
			setAdjustments(presetDefaults);
			setMessage('Preparing a downscaled preview…');
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Could not open this image. Convert it to JPG or PNG first.');
		}
	};

	const update = (key: keyof Omit<Adjustments, 'autoStretch'>, value: number) => {
		setAdjustments((current) => ({ ...current, [key]: value }));
		setResult(null);
	};

	const processFullImage = async () => {
		if (!source || !file) { setMessage('Choose an image before downloading adjustments.'); return; }
		setBusy(true);
		setProgress(0);
		setMessage('Applying adjustments to the full-resolution image in a worker…');
		try {
			const canvas = createCanvas(source.width, source.height) as HTMLCanvasElement;
			const context = canvas.getContext('2d', { willReadFrequently: true });
			if (!context) throw new Error('Your browser could not prepare the full-resolution image.');
			context.drawImage(source.bitmap, 0, 0);
			const pixels = await canvasToImageData(canvas);
			const processed = await runImageWorker({
				type: 'adjust',
				data: pixels.data,
				width: source.width,
				height: source.height,
				adjustments,
			}, (update) => setProgress(update.total ? Math.round(update.completed * 100 / update.total) : 0));
			const outputCanvas = createCanvas(processed.width, processed.height) as HTMLCanvasElement;
			const outputContext = outputCanvas.getContext('2d');
			if (!outputContext) throw new Error('Your browser could not prepare the adjusted image.');
			outputContext.putImageData(new ImageData(processed.data, processed.width, processed.height), 0, 0);
			const blob = await exportImage(outputCanvas, format, quality / 100);
			canvas.width = 0;
			outputCanvas.width = 0;
			setResult(blob);
			setProgress(100);
			setMessage(`Adjusted ${processed.width.toLocaleString()} × ${processed.height.toLocaleString()} px. Estimated size ${formatImageBytes(estimateImageBytes(processed.width, processed.height, format, quality / 100))}; actual size ${formatImageBytes(blob.size)}.`);
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Could not adjust this image. Try a smaller file.');
		} finally {
			setBusy(false);
		}
	};

	const slider = (key: keyof Omit<Adjustments, 'autoStretch'>, label: string, min: number, max: number, step = 1) => (
		<div className="tool-control" style={{ marginTop: 12 }}>
			<label htmlFor={`photo-adjust-${key}`}>{label}: {adjustments[key]}</label>
			<input id={`photo-adjust-${key}`} type="range" min={min} max={max} step={step} value={adjustments[key]} onChange={(event) => update(key, Number(event.target.value))} />
		</div>
	);

	return (
		<div>
			<div className="tool-control">
				<label htmlFor="photo-adjust-file">Choose image</label>
				<input className="image-file-input" id="photo-adjust-file" type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/bmp,.jpg,.jpeg,.png,.webp,.gif,.bmp,.heic,.heif" onChange={(event) => { void chooseFile(event.currentTarget.files?.[0]); }} />
			</div>
			<canvas ref={previewCanvas} style={{ display: 'none' }} aria-hidden="true" />
			{source && <>
				<p className="inline-note">Image: {source.width.toLocaleString()} × {source.height.toLocaleString()} px. Preview is downscaled; full resolution is processed only when you create the download.</p>
				<div className="tool-control" style={{ marginTop: 12 }}>
					<label htmlFor="photo-adjust-histogram">Live luminance histogram</label>
					<canvas id="photo-adjust-histogram" ref={histogramCanvas} style={{ display: 'block', width: '100%', height: 72, border: '1px solid #e6e5dc' }} />
				</div>
				<div className="tool-actions">
					<button className="tool-button secondary" type="button" onClick={() => { setAdjustments((current) => ({ ...current, autoStretch: true })); setResult(null); }}>Auto improve</button>
					<button className="tool-button secondary" type="button" onClick={() => { setAdjustments(presetDefaults); setResult(null); }}>Reset</button>
				</div>
				{slider('brightness', 'Brightness', -100, 100)}
				{slider('contrast', 'Contrast', -100, 100)}
				{slider('exposure', 'Exposure', -2, 2, 0.1)}
				{slider('saturation', 'Saturation', -100, 100)}
				{slider('vibrance', 'Vibrance', -100, 100)}
				{slider('temperature', 'Temperature', -100, 100)}
				{slider('tint', 'Tint', -100, 100)}
				{slider('highlights', 'Highlights', -100, 100)}
				{slider('shadows', 'Shadows', -100, 100)}
				<div className="calc-fields" style={{ marginTop: 14 }}>
					<div className="calc-field">
						<label htmlFor="photo-adjust-format">Output format</label>
						<select id="photo-adjust-format" value={format} onChange={(event) => setFormat(event.target.value as ImageOutputType)}>
							<option value="image/png">PNG</option><option value="image/jpeg">JPG</option><option value="image/webp">WebP</option>
						</select>
					</div>
					{format !== 'image/png' && <div className="calc-field">
						<label htmlFor="photo-adjust-quality">Quality: {quality}%</label>
						<input id="photo-adjust-quality" type="range" min="10" max="100" value={quality} onChange={(event) => setQuality(Number(event.target.value))} />
					</div>}
				</div>
				<p className="inline-note">Estimated output size: {formatImageBytes(estimateImageBytes(source.width, source.height, format, quality / 100))}</p>
				<div className="tool-actions">
					<button className="tool-button" type="button" disabled={busy} onClick={() => void processFullImage()}>{busy ? 'Processing full resolution…' : 'Apply and prepare download'}</button>
					<button className="tool-button secondary" type="button" disabled={!result || !file} onClick={() => result && file && downloadImage(result, `starmore-adjusted.${format === 'image/jpeg' ? 'jpg' : format.slice(6)}`)}>Download image</button>
				</div>
			</>}
			{busy && <progress aria-label="Full resolution processing progress" max={100} value={progress} />}
			{source && <div className="tool-preview" style={{ display: 'block' }}>
				<div style={{ position: 'relative', width: '100%', height: 'min(60vw, 360px)', minHeight: 160, overflow: 'hidden', background: 'repeating-conic-gradient(#eee 0% 25%, #fff 0% 50%) 50% / 16px 16px' }}>
					<img src={previewUrl || inputUrl} alt={previewUrl ? 'Adjusted preview' : 'Original image preview'} style={{ width: '100%', height: '100%', maxWidth: 'none', maxHeight: 'none', objectFit: 'contain' }} />
					{previewUrl && <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', clipPath: `inset(0 ${100 - compare}% 0 0)` }}>
						<img src={inputUrl} alt="Original image comparison" style={{ width: '100%', height: '100%', maxWidth: 'none', maxHeight: 'none', objectFit: 'contain' }} />
					</div>}
				</div>
				{previewUrl && <label style={{ display: 'block', marginTop: 10 }}>
					<span style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', border: 0 }}>Compare original image</span>
					<input style={{ width: '100%' }} type="range" min="0" max="100" value={compare} onChange={(event) => setCompare(Number(event.target.value))} />
				</label>}
			</div>}
			<p className="tool-message" role="status">{message}</p>
			<p className="privacy-note">Your image files never leave your device. Full-resolution adjustments run in a background worker; PNG and WebP preserve transparency.</p>
		</div>
	);
}
