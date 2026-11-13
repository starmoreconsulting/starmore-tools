import { useEffect, useMemo, useState } from 'react';
import {
	canvasToImageData,
	checkImageDimensions,
	createCanvas,
	decodeImageFile,
	downloadImage,
	estimateImageBytes,
	exportImage,
	formatImageBytes,
	formatImageBytes as formatBytes,
	runImageWorker,
	type DecodedImage,
	type ImageOutputType,
	type ResampleMode,
} from '../../engines/image/toolkit';

type ScaleChoice = '2' | '3' | '4' | 'custom';

export default function ImageUpscaler() {
	const [file, setFile] = useState<File | null>(null);
	const [source, setSource] = useState<DecodedImage | null>(null);
	const [scale, setScale] = useState<ScaleChoice>('2');
	const [customWidth, setCustomWidth] = useState('');
	const [mode, setMode] = useState<ResampleMode>('photo');
	const [sharpen, setSharpen] = useState(false);
	const [outputType, setOutputType] = useState<ImageOutputType>('image/png');
	const [quality, setQuality] = useState(90);
	const [output, setOutput] = useState<Blob | null>(null);
	const [outputUrl, setOutputUrl] = useState('');
	const [inputUrl, setInputUrl] = useState('');
	const [progress, setProgress] = useState(0);
	const [busy, setBusy] = useState(false);
	const [compare, setCompare] = useState(50);
	const [message, setMessage] = useState('Choose an image. Processing stays entirely on your device.');

	useEffect(() => () => source?.bitmap.close(), [source]);
	useEffect(() => {
		if (!output) {
			setOutputUrl('');
			return;
		}
		const url = URL.createObjectURL(output);
		setOutputUrl(url);
		return () => URL.revokeObjectURL(url);
	}, [output]);
	useEffect(() => {
		if (!file) {
			setInputUrl('');
			return;
		}
		const url = URL.createObjectURL(file);
		setInputUrl(url);
		return () => URL.revokeObjectURL(url);
	}, [file]);

	const dimensions = useMemo(() => {
		if (!source) return null;
		const width = scale === 'custom' ? Number(customWidth) : source.width * Number(scale);
		if (!Number.isSafeInteger(width) || width < 1) return null;
		const height = Math.max(1, Math.round(width * source.height / source.width));
		return { width, height };
	}, [source, scale, customWidth]);

	const estimatedSize = dimensions ? estimateImageBytes(dimensions.width, dimensions.height, outputType, quality / 100) : 0;

	const chooseFile = async (selected?: File) => {
		setOutput(null);
		setSource(null);
		setFile(null);
		if (!selected) {
			setMessage('Choose an image to begin.');
			return;
		}
		try {
			const decoded = await decodeImageFile(selected);
			setSource(decoded);
			setFile(selected);
			setCustomWidth(String(decoded.width * 2));
			setMessage(`Image ready: ${decoded.width.toLocaleString()} × ${decoded.height.toLocaleString()} px. Choose a scale and upscale.`);
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Could not open this image. Try converting it to JPG or PNG first.');
		}
	};

	const upscale = async () => {
		if (!source || !file) {
			setMessage('Choose an image before upscaling.');
			return;
		}
		if (!dimensions) {
			setMessage('Enter a valid whole-number target width.');
			return;
		}
		try {
			checkImageDimensions(dimensions.width, dimensions.height);
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'The requested output is too large.');
			return;
		}
		setBusy(true);
		setProgress(0);
		setOutput(null);
		setMessage('Upscaling in a background worker…');
		try {
			const inputCanvas = createCanvas(source.width, source.height) as HTMLCanvasElement;
			const context = inputCanvas.getContext('2d', { willReadFrequently: true });
			if (!context) throw new Error('Your browser could not prepare the image pixels.');
			context.drawImage(source.bitmap, 0, 0);
			const pixels = await canvasToImageData(inputCanvas);
			const result = await runImageWorker({
				type: 'upscale',
				data: pixels.data,
				width: source.width,
				height: source.height,
				outputWidth: dimensions.width,
				outputHeight: dimensions.height,
				mode,
				sharpen: sharpen ? 0.2 : 0,
			}, (update) => setProgress(update.total ? Math.round(update.completed * 100 / update.total) : 0));
			const canvas = createCanvas(result.width, result.height) as HTMLCanvasElement;
			const outputContext = canvas.getContext('2d');
			if (!outputContext) throw new Error('Your browser could not prepare the output image.');
			outputContext.putImageData(new ImageData(result.data, result.width, result.height), 0, 0);
			const blob = await exportImage(canvas, outputType, quality / 100);
			inputCanvas.width = 0;
			inputCanvas.height = 0;
			canvas.width = 0;
			canvas.height = 0;
			setOutput(blob);
			setProgress(100);
			setMessage(`Upscaled image: ${result.width.toLocaleString()} × ${result.height.toLocaleString()} px. Estimated size was ${formatBytes(estimatedSize)}; actual size is ${formatImageBytes(blob.size)}.`);
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Could not upscale this image. Try a smaller target size.');
		} finally {
			setBusy(false);
		}
	};

	return (
		<div>
			<div className="tool-control">
				<label htmlFor="upscaler-file">Choose image</label>
				<input className="image-file-input" id="upscaler-file" type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/bmp,.jpg,.jpeg,.png,.webp,.gif,.bmp,.heic,.heif" onChange={(event) => { void chooseFile(event.currentTarget.files?.[0]); }} />
			</div>
			{source && <p className="inline-note">Original: {source.width.toLocaleString()} × {source.height.toLocaleString()} px</p>}
			<div className="calc-fields" style={{ marginTop: 15 }}>
				<div className="calc-field">
					<label htmlFor="upscaler-scale">Scale</label>
					<select id="upscaler-scale" value={scale} onChange={(event) => setScale(event.target.value as ScaleChoice)}>
						<option value="2">2×</option><option value="3">3×</option><option value="4">4×</option><option value="custom">Custom target width</option>
					</select>
				</div>
				{scale === 'custom' && <div className="calc-field">
					<label htmlFor="upscaler-width">Target width (px)</label>
					<input id="upscaler-width" type="number" min="1" step="1" inputMode="numeric" value={customWidth} onChange={(event) => setCustomWidth(event.target.value)} />
				</div>}
				<div className="calc-field">
					<label htmlFor="upscaler-mode">Resampling</label>
					<select id="upscaler-mode" value={mode} onChange={(event) => setMode(event.target.value as ResampleMode)}>
						<option value="photo">Photo (Lanczos-3)</option><option value="pixel-art">Pixel art (nearest neighbour)</option>
					</select>
				</div>
				<div className="calc-field">
					<label htmlFor="upscaler-format">Output format</label>
					<select id="upscaler-format" value={outputType} onChange={(event) => setOutputType(event.target.value as ImageOutputType)}>
						<option value="image/png">PNG</option><option value="image/jpeg">JPG</option><option value="image/webp">WebP</option>
					</select>
				</div>
				{outputType !== 'image/png' && <div className="calc-field">
					<label htmlFor="upscaler-quality">Quality: {quality}%</label>
					<input id="upscaler-quality" type="range" min="10" max="100" value={quality} onChange={(event) => setQuality(Number(event.target.value))} />
				</div>}
			</div>
			<label className="tool-choice" style={{ marginTop: 12 }}>
				<input type="checkbox" checked={sharpen} onChange={(event) => setSharpen(event.target.checked)} />
				<span>Apply gentle sharpening</span>
			</label>
			{dimensions && <p className="inline-note">Output: {dimensions.width.toLocaleString()} × {dimensions.height.toLocaleString()} px · estimated file size {formatImageBytes(estimatedSize)}</p>}
			<div className="tool-actions">
				<button className="tool-button" type="button" disabled={!source || busy} onClick={() => void upscale()}>{busy ? 'Upscaling…' : 'Upscale image'}</button>
				<button className="tool-button secondary" type="button" disabled={!output || !file} onClick={() => output && file && downloadImage(output, `starmore-upscaled.${outputType === 'image/jpeg' ? 'jpg' : outputType.slice(6)}`)}>Download image</button>
			</div>
			{busy && <progress aria-label="Upscaling progress" max={100} value={progress} style={{ display: 'block', width: '100%', height: 10, marginTop: 12, accentColor: '#55744d' }} />}
			{source && outputUrl && <div className="tool-preview" style={{ display: 'block', padding: 12 }}>
				<div style={{ position: 'relative', width: '100%', height: 'min(60vw, 360px)', minHeight: 160, overflow: 'hidden', background: 'repeating-conic-gradient(#eee 0% 25%, #fff 0% 50%) 50% / 16px 16px' }}>
					<img src={outputUrl} alt="Upscaled image comparison" style={{ width: '100%', height: '100%', maxWidth: 'none', maxHeight: 'none', objectFit: 'contain' }} />
					<div style={{ position: 'absolute', inset: 0, overflow: 'hidden', clipPath: `inset(0 ${100 - compare}% 0 0)` }}>
						<img src={inputUrl} alt="Original image comparison" style={{ width: '100%', height: '100%', maxWidth: 'none', maxHeight: 'none', objectFit: 'contain' }} />
					</div>
					<div style={{ position: 'absolute', top: 0, bottom: 0, left: `${compare}%`, width: 2, background: '#55744d', pointerEvents: 'none' }} />
				</div>
				<label style={{ display: 'block', marginTop: 10 }}>
					<span style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', border: 0 }}>Reveal original image</span>
					<input style={{ width: '100%', accentColor: '#55744d' }} type="range" min="0" max="100" value={compare} onChange={(event) => setCompare(Number(event.target.value))} />
				</label>
			</div>}
			<p className="tool-message" role="status">{message}</p>
			<p className="privacy-note">Your image files never leave your device. This enlarges and smooths images; it cannot invent detail that was never there. JPG has no transparency; PNG and WebP preserve it.</p>
		</div>
	);
}
