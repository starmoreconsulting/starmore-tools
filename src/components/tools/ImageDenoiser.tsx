import { useEffect, useState } from 'react';
import {
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

export default function ImageDenoiser() {
	const [file, setFile] = useState<File | null>(null);
	const [source, setSource] = useState<DecodedImage | null>(null);
	const [inputUrl, setInputUrl] = useState('');
	const [result, setResult] = useState<Blob | null>(null);
	const [resultUrl, setResultUrl] = useState('');
	const [luminance, setLuminance] = useState(0.45);
	const [color, setColor] = useState(0.45);
	const [zoom, setZoom] = useState(2);
	const [compare, setCompare] = useState(50);
	const [format, setFormat] = useState<ImageOutputType>('image/png');
	const [quality, setQuality] = useState(90);
	const [busy, setBusy] = useState(false);
	const [progress, setProgress] = useState(0);
	const [message, setMessage] = useState('Choose an image. Processing stays entirely on your device.');

	useEffect(() => () => source?.bitmap.close(), [source]);
	useEffect(() => {
		if (!file) { setInputUrl(''); return; }
		const url = URL.createObjectURL(file);
		setInputUrl(url);
		return () => URL.revokeObjectURL(url);
	}, [file]);
	useEffect(() => {
		if (!result) { setResultUrl(''); return; }
		const url = URL.createObjectURL(result);
		setResultUrl(url);
		return () => URL.revokeObjectURL(url);
	}, [result]);

	const chooseFile = async (selected?: File) => {
		setSource(null);
		setFile(null);
		setResult(null);
		if (!selected) return;
		try {
			const decoded = await decodeImageFile(selected);
			setSource(decoded);
			setFile(selected);
			setMessage(`Image ready: ${decoded.width.toLocaleString()} × ${decoded.height.toLocaleString()} px.`);
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Could not open this image. Convert it to JPG or PNG first.');
		}
	};

	const denoise = async () => {
		if (!source) { setMessage('Choose an image before reducing noise.'); return; }
		setBusy(true);
		setProgress(0);
		setResult(null);
		setMessage('Reducing noise in a background worker…');
		try {
			const canvas = createCanvas(source.width, source.height) as HTMLCanvasElement;
			const context = canvas.getContext('2d', { willReadFrequently: true });
			if (!context) throw new Error('Your browser could not prepare the image pixels.');
			context.drawImage(source.bitmap, 0, 0);
			const pixels = await canvasToImageData(canvas);
			const processed = await runImageWorker({
				type: 'denoise',
				data: pixels.data,
				width: source.width,
				height: source.height,
				luminanceStrength: luminance,
				colorStrength: color,
			}, (update) => setProgress(update.total ? Math.round(update.completed * 100 / update.total) : 0));
			const outputCanvas = createCanvas(processed.width, processed.height) as HTMLCanvasElement;
			const outputContext = outputCanvas.getContext('2d');
			if (!outputContext) throw new Error('Your browser could not prepare the denoised image.');
			outputContext.putImageData(new ImageData(processed.data, processed.width, processed.height), 0, 0);
			const blob = await exportImage(outputCanvas, format, quality / 100);
			canvas.width = 0;
			outputCanvas.width = 0;
			setResult(blob);
			setProgress(100);
			setMessage(`Denoised ${processed.width.toLocaleString()} × ${processed.height.toLocaleString()} px. Estimated size ${formatImageBytes(estimateImageBytes(processed.width, processed.height, format, quality / 100))}; actual size ${formatImageBytes(blob.size)}.`);
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Could not process this image. Try a smaller file.');
		} finally {
			setBusy(false);
		}
	};

	return (
		<div>
			<div className="tool-control">
				<label htmlFor="denoiser-file">Choose image</label>
				<input className="image-file-input" id="denoiser-file" type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/bmp,.jpg,.jpeg,.png,.webp,.gif,.bmp,.heic,.heif" onChange={(event) => { void chooseFile(event.currentTarget.files?.[0]); }} />
			</div>
			{source && <p className="inline-note">Output: {source.width.toLocaleString()} × {source.height.toLocaleString()} px · estimated PNG size {formatImageBytes(estimateImageBytes(source.width, source.height, format, quality / 100))}</p>}
			<div className="tool-control" style={{ marginTop: 14 }}>
				<label htmlFor="denoiser-luminance">Luminance noise reduction: {Math.round(luminance * 100)}%</label>
				<input id="denoiser-luminance" type="range" min="0" max="1" step="0.05" value={luminance} onChange={(event) => setLuminance(Number(event.target.value))} />
			</div>
			<div className="tool-control" style={{ marginTop: 14 }}>
				<label htmlFor="denoiser-color">Colour noise reduction: {Math.round(color * 100)}%</label>
				<input id="denoiser-color" type="range" min="0" max="1" step="0.05" value={color} onChange={(event) => setColor(Number(event.target.value))} />
			</div>
			<div className="calc-fields" style={{ marginTop: 14 }}>
				<div className="calc-field">
					<label htmlFor="denoiser-zoom">Zoom crop: {zoom}×</label>
					<input id="denoiser-zoom" type="range" min="1" max="5" step="1" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} />
				</div>
				<div className="calc-field">
					<label htmlFor="denoiser-format">Output format</label>
					<select id="denoiser-format" value={format} onChange={(event) => setFormat(event.target.value as ImageOutputType)}>
						<option value="image/png">PNG</option><option value="image/jpeg">JPG</option><option value="image/webp">WebP</option>
					</select>
				</div>
			</div>
			{format !== 'image/png' && <div className="tool-control" style={{ marginTop: 14 }}>
				<label htmlFor="denoiser-quality">Quality: {quality}%</label>
				<input id="denoiser-quality" type="range" min="10" max="100" value={quality} onChange={(event) => setQuality(Number(event.target.value))} />
			</div>}
			<div className="tool-actions">
				<button className="tool-button" type="button" disabled={!source || busy} onClick={() => void denoise()}>{busy ? 'Reducing noise…' : 'Reduce noise'}</button>
				<button className="tool-button secondary" type="button" disabled={!result || !file} onClick={() => result && file && downloadImage(result, `starmore-denoised.${format === 'image/jpeg' ? 'jpg' : format.slice(6)}`)}>Download image</button>
			</div>
			{busy && <progress aria-label="Noise reduction progress" max={100} value={progress} />}
			{source && <div className="tool-preview" style={{ display: 'block' }}>
				<div style={{ position: 'relative', width: '100%', height: 'min(60vw, 360px)', minHeight: 160, overflow: 'hidden', background: 'repeating-conic-gradient(#eee 0% 25%, #fff 0% 50%) 50% / 16px 16px' }}>
					<img src={resultUrl || inputUrl} alt={resultUrl ? 'Denoised image' : 'Original image'} style={{ width: '100%', height: '100%', maxWidth: 'none', maxHeight: 'none', objectFit: 'contain', transform: `scale(${zoom})` }} />
					{resultUrl && <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', clipPath: `inset(0 ${100 - compare}% 0 0)` }}>
						<img src={inputUrl} alt="Original image comparison" style={{ width: '100%', height: '100%', maxWidth: 'none', maxHeight: 'none', objectFit: 'contain', transform: `scale(${zoom})` }} />
					</div>}
				</div>
				{resultUrl && <label style={{ display: 'block', marginTop: 10 }}>
					<span style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', border: 0 }}>Compare original image</span>
					<input style={{ width: '100%' }} type="range" min="0" max="100" value={compare} onChange={(event) => setCompare(Number(event.target.value))} />
				</label>}
			</div>}
			<p className="tool-message" role="status">{message}</p>
			<p className="privacy-note">Your image files never leave your device. This edge-preserving filter reduces noise but can soften fine detail.</p>
		</div>
	);
}
