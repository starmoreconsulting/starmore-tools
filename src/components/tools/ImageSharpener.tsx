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

export default function ImageSharpener() {
	const [file, setFile] = useState<File | null>(null);
	const [source, setSource] = useState<DecodedImage | null>(null);
	const [inputUrl, setInputUrl] = useState('');
	const [output, setOutput] = useState<Blob | null>(null);
	const [outputUrl, setOutputUrl] = useState('');
	const [amount, setAmount] = useState(1.2);
	const [radius, setRadius] = useState(2);
	const [threshold, setThreshold] = useState(4);
	const [zoom, setZoom] = useState(1);
	const [compare, setCompare] = useState(50);
	const [holdingOriginal, setHoldingOriginal] = useState(false);
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
		if (!output) { setOutputUrl(''); return; }
		const url = URL.createObjectURL(output);
		setOutputUrl(url);
		return () => URL.revokeObjectURL(url);
	}, [output]);

	const chooseFile = async (selected?: File) => {
		setSource(null);
		setFile(null);
		setOutput(null);
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

	const sharpenImage = async () => {
		if (!source) { setMessage('Choose an image before sharpening.'); return; }
		setBusy(true);
		setProgress(0);
		setOutput(null);
		setMessage('Sharpening in a background worker…');
		try {
			const canvas = createCanvas(source.width, source.height) as HTMLCanvasElement;
			const context = canvas.getContext('2d', { willReadFrequently: true });
			if (!context) throw new Error('Your browser could not prepare the image pixels.');
			context.drawImage(source.bitmap, 0, 0);
			const pixels = await canvasToImageData(canvas);
			const result = await runImageWorker({
				type: 'sharpen',
				data: pixels.data,
				width: source.width,
				height: source.height,
				amount,
				radius,
				threshold,
			}, (update) => setProgress(update.total ? Math.round(update.completed * 100 / update.total) : 0));
			const resultCanvas = createCanvas(result.width, result.height) as HTMLCanvasElement;
			const resultContext = resultCanvas.getContext('2d');
			if (!resultContext) throw new Error('Your browser could not prepare the sharpened image.');
			resultContext.putImageData(new ImageData(result.data, result.width, result.height), 0, 0);
			const blob = await exportImage(resultCanvas, format, quality / 100);
			canvas.width = 0;
			canvas.height = 0;
			resultCanvas.width = 0;
			resultCanvas.height = 0;
			setOutput(blob);
			setProgress(100);
			setMessage(`Sharpened ${result.width.toLocaleString()} × ${result.height.toLocaleString()} px. Estimated size ${formatImageBytes(estimateImageBytes(result.width, result.height, format, quality / 100))}; actual size ${formatImageBytes(blob.size)}.`);
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Could not sharpen this image. Try a smaller file.');
		} finally {
			setBusy(false);
		}
	};

	const originalDown = () => setHoldingOriginal(true);
	const originalUp = () => setHoldingOriginal(false);

	return (
		<div>
			<div className="tool-control">
				<label htmlFor="sharpener-file">Choose image</label>
				<input className="image-file-input" id="sharpener-file" type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/bmp,.jpg,.jpeg,.png,.webp,.gif,.bmp,.heic,.heif" onChange={(event) => { void chooseFile(event.currentTarget.files?.[0]); }} />
			</div>
			{source && <p className="inline-note">Output size: {source.width.toLocaleString()} × {source.height.toLocaleString()} px · estimated PNG size {formatImageBytes(estimateImageBytes(source.width, source.height, format, quality / 100))}</p>}
			<div className="tool-control" style={{ marginTop: 14 }}>
				<label htmlFor="sharpener-amount">Amount: {amount.toFixed(1)}</label>
				<input id="sharpener-amount" type="range" min="0" max="3" step="0.1" value={amount} onChange={(event) => setAmount(Number(event.target.value))} />
			</div>
			<div className="tool-control" style={{ marginTop: 14 }}>
				<label htmlFor="sharpener-radius">Radius: {radius} px</label>
				<input id="sharpener-radius" type="range" min="1" max="8" step="1" value={radius} onChange={(event) => setRadius(Number(event.target.value))} />
			</div>
			<div className="tool-control" style={{ marginTop: 14 }}>
				<label htmlFor="sharpener-threshold">Threshold: {threshold}</label>
				<input id="sharpener-threshold" type="range" min="0" max="40" step="1" value={threshold} onChange={(event) => setThreshold(Number(event.target.value))} />
			</div>
			<div className="calc-fields" style={{ marginTop: 14 }}>
				<div className="calc-field">
					<label htmlFor="sharpener-zoom">Zoom crop: {zoom.toFixed(1)}×</label>
					<input id="sharpener-zoom" type="range" min="1" max="4" step="0.1" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} />
				</div>
				<div className="calc-field">
					<label htmlFor="sharpener-format">Output format</label>
					<select id="sharpener-format" value={format} onChange={(event) => setFormat(event.target.value as ImageOutputType)}>
						<option value="image/png">PNG</option><option value="image/jpeg">JPG</option><option value="image/webp">WebP</option>
					</select>
				</div>
			</div>
			{format !== 'image/png' && <div className="tool-control" style={{ marginTop: 14 }}>
				<label htmlFor="sharpener-quality">Quality: {quality}%</label>
				<input id="sharpener-quality" type="range" min="10" max="100" value={quality} onChange={(event) => setQuality(Number(event.target.value))} />
			</div>}
			<div className="tool-actions">
				<button className="tool-button" type="button" disabled={!source || busy} onClick={() => void sharpenImage()}>{busy ? 'Sharpening…' : 'Sharpen image'}</button>
				<button className="tool-button secondary" type="button" disabled={!output || !file} onClick={() => output && file && downloadImage(output, `starmore-sharpened.${format === 'image/jpeg' ? 'jpg' : format.slice(6)}`)}>Download image</button>
				<button className="tool-button secondary" type="button" disabled={!source} onPointerDown={originalDown} onPointerUp={originalUp} onPointerLeave={originalUp} onPointerCancel={originalUp} onKeyDown={(event) => { if (event.key === ' ' || event.key === 'Enter') originalDown(); }} onKeyUp={originalUp}>Hold to compare original</button>
			</div>
			{busy && <progress aria-label="Sharpening progress" max={100} value={progress} />}
			{source && <div className="tool-preview" style={{ display: 'block' }}>
				<div style={{ position: 'relative', width: '100%', height: 'min(60vw, 360px)', minHeight: 160, overflow: 'hidden', background: 'repeating-conic-gradient(#eee 0% 25%, #fff 0% 50%) 50% / 16px 16px' }}>
					<img src={holdingOriginal || !outputUrl ? inputUrl : outputUrl} alt={holdingOriginal || !outputUrl ? 'Original image' : 'Sharpened image'} style={{ width: '100%', height: '100%', maxWidth: 'none', maxHeight: 'none', objectFit: 'contain', transform: `scale(${zoom})` }} />
					{outputUrl && !holdingOriginal && <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', clipPath: `inset(0 ${100 - compare}% 0 0)` }}>
						<img src={inputUrl} alt="Original image comparison" style={{ width: '100%', height: '100%', maxWidth: 'none', maxHeight: 'none', objectFit: 'contain', transform: `scale(${zoom})` }} />
					</div>}
				</div>
				{outputUrl && <label style={{ display: 'block', marginTop: 10 }}>
					<span style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', border: 0 }}>Compare original image</span>
					<input style={{ width: '100%' }} type="range" min="0" max="100" value={compare} onChange={(event) => setCompare(Number(event.target.value))} />
				</label>}
			</div>}
			<p className="tool-message" role="status">{message}</p>
			<p className="privacy-note">Your image files never leave your device. The sharpener uses an unsharp mask; it cannot recover detail that is absent from the source image.</p>
		</div>
	);
}
