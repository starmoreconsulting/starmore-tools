import { useEffect, useRef, useState } from 'react';
import { decodeImageFile, downloadImage, formatImageBytes, type DecodedImage, type ImageOutputType } from '../../engines/image/toolkit';
import { detectCornerColor } from '../../engines/image/logo-key';
import { processLogoImage } from '../../engines/image/logo-key-engine';
import type { ColorKeyOptions } from '../../engines/image/logo-key';

const ACCEPTED = 'image/jpeg,image/png,image/webp,image/gif,image/bmp,.jpg,.jpeg,.png,.webp,.gif,.bmp,.heic,.heif';

export default function LogoBackgroundRemover() {
	const [file, setFile] = useState<File | null>(null);
	const [source, setSource] = useState<DecodedImage | null>(null);
	const [sourceUrl, setSourceUrl] = useState('');
	const [resultUrl, setResultUrl] = useState('');
	const [key, setKey] = useState<[number, number, number] | null>(null);
	const [seed, setSeed] = useState<{ x: number; y: number } | undefined>();
	const [tolerance, setTolerance] = useState(30);
	const [softEdge, setSoftEdge] = useState(12);
	const [connectedOnly, setConnectedOnly] = useState(true);
	const [cleanupNoise, setCleanupNoise] = useState(false);
	const [picking, setPicking] = useState(false);
	const [trim, setTrim] = useState(false);
	const [padding, setPadding] = useState(16);
	const [format, setFormat] = useState<ImageOutputType>('image/png');
	const [surface, setSurface] = useState('checkerboard');
	const [customSurface, setCustomSurface] = useState('#dce9ef');
	const [compare, setCompare] = useState(50);
	const [busy, setBusy] = useState(false);
	const [message, setMessage] = useState('Choose a logo image. Colour keying runs locally in a background worker.');
	const sampleCanvas = useRef<HTMLCanvasElement>(null);
	const versionRef = useRef(0);

	useEffect(() => () => source?.bitmap.close(), [source]);
	useEffect(() => {
		if (!file) { setSourceUrl(''); return; }
		const url = URL.createObjectURL(file);
		setSourceUrl(url);
		return () => URL.revokeObjectURL(url);
	}, [file]);
	useEffect(() => {
		if (!resultUrl) return;
		return () => URL.revokeObjectURL(resultUrl);
	}, [resultUrl]);

	const runPreview = (
		selectedFile: File,
		selectedKey: [number, number, number],
		selectedSeed: { x: number; y: number } | undefined,
		options = { tolerance, softEdge, connectedOnly, cleanupNoise },
		trimOptions = { enabled: trim, padding },
	) => {
		const version = ++versionRef.current;
		setBusy(true);
		void processLogoImage({
			file: selectedFile,
			key: { key: selectedKey, seed: selectedSeed, tolerance: options.tolerance, softEdge: options.softEdge, connectedOnly: options.connectedOnly, cleanupNoise: options.cleanupNoise },
			trim: trimOptions,
		}).then((blob) => {
			if (version !== versionRef.current) return;
			setResultUrl(URL.createObjectURL(blob));
			setMessage(`Preview ready · ${formatImageBytes(blob.size)}. Choose PNG or WebP to download.`);
		}).catch((error: unknown) => {
			if (version === versionRef.current) setMessage(error instanceof Error ? error.message : 'Could not remove the logo background.');
		}).finally(() => {
			if (version === versionRef.current) setBusy(false);
		});
	};

	const chooseFile = async (selected?: File) => {
		versionRef.current += 1;
		setResultUrl('');
		setSource(null);
		setFile(null);
		setKey(null);
		setSeed(undefined);
		setPicking(false);
		if (!selected) return;
		try {
			const decoded = await decodeImageFile(selected);
			setSource(decoded);
			setFile(selected);
			setMessage(`${decoded.width.toLocaleString()} × ${decoded.height.toLocaleString()} px image ready. Pick the background colour or try the four corners.`);
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Could not open this image. Convert it to JPG or PNG first.');
		}
	};

	const readSample = (x: number, y: number) => {
		if (!source || !sampleCanvas.current) return null;
		const scale = Math.min(1, 256 / Math.max(source.width, source.height));
		const width = Math.max(1, Math.round(source.width * scale));
		const height = Math.max(1, Math.round(source.height * scale));
		const canvas = sampleCanvas.current;
		canvas.width = width;
		canvas.height = height;
		const context = canvas.getContext('2d', { willReadFrequently: true });
		if (!context) return null;
		context.drawImage(source.bitmap, 0, 0, width, height);
		return context.getImageData(Math.max(0, Math.min(width - 1, x)), Math.max(0, Math.min(height - 1, y)), 1, 1).data;
	};

	const autoDetect = () => {
		if (!source || !sampleCanvas.current) return;
		const scale = Math.min(1, 256 / Math.max(source.width, source.height));
		const width = Math.max(1, Math.round(source.width * scale));
		const height = Math.max(1, Math.round(source.height * scale));
		const canvas = sampleCanvas.current;
		canvas.width = width;
		canvas.height = height;
		const context = canvas.getContext('2d', { willReadFrequently: true });
		if (!context) { setMessage('Your browser could not inspect the image corners. Click the background colour instead.'); return; }
		context.drawImage(source.bitmap, 0, 0, width, height);
		const color = detectCornerColor(context.getImageData(0, 0, width, height).data, width, height);
		if (!color) {
			setPicking(true);
			setMessage('The four corners disagree. Click or tap the intended background colour in the image.');
			return;
		}
		const point = { x: 0, y: 0 };
		setKey(color);
		setSeed(point);
		setPicking(false);
		if (file) runPreview(file, color, point);
	};

	const pickFromImage = (event: React.MouseEvent<HTMLImageElement>) => {
		if (!picking || !source || !file) return;
		const rect = event.currentTarget.getBoundingClientRect();
		const scale = Math.min(1, 256 / Math.max(source.width, source.height));
		const width = Math.max(1, Math.round(source.width * scale));
		const height = Math.max(1, Math.round(source.height * scale));
		const x = Math.max(0, Math.min(width - 1, Math.floor((event.clientX - rect.left) / rect.width * width)));
		const y = Math.max(0, Math.min(height - 1, Math.floor((event.clientY - rect.top) / rect.height * height)));
		const pixel = readSample(x, y);
		if (!pixel) return;
		const selected: [number, number, number] = [pixel[0], pixel[1], pixel[2]];
		const point = { x: Math.round(x / width * source.width), y: Math.round(y / height * source.height) };
		setKey(selected);
		setSeed(point);
		setPicking(false);
		runPreview(file, selected, point);
	};

	const currentOptions: ColorKeyOptions | null = key ? { key, seed, tolerance, softEdge, connectedOnly, cleanupNoise } : null;
	const download = async () => {
		if (!file || !currentOptions) { setMessage('Pick a background colour before downloading a transparent logo.'); return; }
		setBusy(true);
		try {
			const blob = await processLogoImage({ file, key: currentOptions, trim: { enabled: trim, padding }, format });
			downloadImage(blob, `logo-background-removed.${format === 'image/png' ? 'png' : 'webp'}`);
			setMessage(`Downloaded ${format === 'image/png' ? 'PNG' : 'WebP'} · ${formatImageBytes(blob.size)}.`);
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Could not export the transparent logo.');
		} finally {
			setBusy(false);
		}
	};

	const setNumber = (name: 'tolerance' | 'softEdge' | 'connectedOnly' | 'cleanupNoise', value: number | boolean) => {
		const next = {
			tolerance: name === 'tolerance' ? Number(value) : tolerance,
			softEdge: name === 'softEdge' ? Number(value) : softEdge,
			connectedOnly: name === 'connectedOnly' ? Boolean(value) : connectedOnly,
			cleanupNoise: name === 'cleanupNoise' ? Boolean(value) : cleanupNoise,
		};
		if (name === 'tolerance') setTolerance(next.tolerance);
		if (name === 'softEdge') setSoftEdge(next.softEdge);
		if (name === 'connectedOnly') setConnectedOnly(next.connectedOnly);
		if (name === 'cleanupNoise') setCleanupNoise(next.cleanupNoise);
		if (file && key) runPreview(file, key, seed, next);
	};

	return <div>
		<div className="tool-control"><label htmlFor="logo-background-file">Choose logo image</label><input id="logo-background-file" className="image-file-input" type="file" accept={ACCEPTED} onChange={(event) => { void chooseFile(event.currentTarget.files?.[0]); }} /></div>
		<p className="privacy-note">Your image stays on this device. This tool uses no AI model and sends no image data to a server.</p>
		{source && <p className="inline-note">Image: {source.width.toLocaleString()} × {source.height.toLocaleString()} px · tolerance keying is processed in a worker.</p>}
		<div className="tool-actions">
			<button className="tool-button secondary" type="button" disabled={!source} onClick={() => { setPicking(true); setMessage('Click or tap the background colour in the image to sample it.'); }}>Pick background colour</button>
			<button className="tool-button secondary" type="button" disabled={!source || busy} onClick={autoDetect}>Auto-detect from corners</button>
		</div>
		{key && <p className="inline-note">Key colour: <span style={{ display: 'inline-block', width: 18, height: 18, verticalAlign: 'middle', background: `rgb(${key.join(',')})`, border: '1px solid #777' }} /> RGB({key.join(', ')})</p>}
		<div className="calc-fields" style={{ marginTop: 14 }}>
			<div className="calc-field"><label htmlFor="logo-key-tolerance">Tolerance: {tolerance}</label><input id="logo-key-tolerance" type="range" min="0" max="255" value={tolerance} onChange={(event) => setNumber('tolerance', Number(event.target.value))} /></div>
			<div className="calc-field"><label htmlFor="logo-key-soft-edge">Soft edge: {softEdge}</label><input id="logo-key-soft-edge" type="range" min="0" max="100" value={softEdge} onChange={(event) => setNumber('softEdge', Number(event.target.value))} /></div>
		</div>
		<div className="calc-field" style={{ marginTop: 12 }}><label htmlFor="logo-key-mode">Colour removal area</label><select id="logo-key-mode" value={connectedOnly ? 'connected' : 'all'} onChange={(event) => setNumber('connectedOnly', event.target.value === 'connected')}><option value="connected">Connected area only (flood fill)</option><option value="all">All matching pixels</option></select></div>
		{source?.type === 'image/jpeg' && <label className="tool-control" style={{ marginTop: 12 }}><input type="checkbox" checked={cleanupNoise} onChange={(event) => setNumber('cleanupNoise', event.target.checked)} /> Clean up compression noise near edges</label>}
		<div className="tool-control" style={{ marginTop: 12 }}><label><input type="checkbox" checked={trim} onChange={(event) => { const enabled = event.target.checked; setTrim(enabled); if (file && key) runPreview(file, key, seed, undefined, { enabled, padding }); }} /> Trim empty space</label>{trim && <div className="calc-field"><label htmlFor="logo-key-padding">Trim padding: {padding} px</label><input id="logo-key-padding" type="range" min="0" max="200" value={padding} onChange={(event) => { const selectedPadding = Number(event.target.value); setPadding(selectedPadding); if (file && key) runPreview(file, key, seed, undefined, { enabled: trim, padding: selectedPadding }); }} /></div>}</div>
		<div className="calc-fields" style={{ marginTop: 12 }}>
			<div className="calc-field"><label htmlFor="logo-key-surface">Preview background</label><select id="logo-key-surface" value={surface} onChange={(event) => setSurface(event.target.value)}><option value="checkerboard">Checkerboard</option><option value="white">White</option><option value="black">Black</option><option value="custom">Custom colour</option></select></div>
			{surface === 'custom' && <div className="calc-field"><label htmlFor="logo-key-custom-surface">Custom preview colour</label><input id="logo-key-custom-surface" type="color" value={customSurface} onChange={(event) => setCustomSurface(event.target.value)} /></div>}
			<div className="calc-field"><label htmlFor="logo-key-format">Export format</label><select id="logo-key-format" value={format} onChange={(event) => setFormat(event.target.value as ImageOutputType)}><option value="image/png">PNG</option><option value="image/webp">WebP</option></select></div>
		</div>
		{sourceUrl && <div className={`tool-preview ${surface === 'checkerboard' ? 'transparency-preview' : ''}`} style={{ background: surface === 'white' ? '#fff' : surface === 'black' ? '#000' : surface === 'custom' ? customSurface : undefined, position: 'relative', cursor: picking ? 'crosshair' : 'default' }}>
			<img src={sourceUrl} alt="Original logo image; click to pick its background colour" onClick={pickFromImage} style={{ maxWidth: '100%', maxHeight: 520, objectFit: 'contain' }} />
			{resultUrl && <img src={resultUrl} alt="Logo with transparent background" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', clipPath: `inset(0 ${100 - compare}% 0 0)`, pointerEvents: 'none' }} />}
			{resultUrl && <span style={{ position: 'absolute', left: `${compare}%`, top: 0, bottom: 0, borderLeft: '2px solid #fff', pointerEvents: 'none' }} />}
		</div>}
		{resultUrl && <div className="calc-field"><label htmlFor="logo-key-compare">Before / after: {compare}%</label><input id="logo-key-compare" type="range" min="0" max="100" value={compare} onChange={(event) => setCompare(Number(event.target.value))} /></div>}
		<canvas ref={sampleCanvas} style={{ display: 'none' }} />
		<div className="tool-actions"><button className="tool-button" type="button" disabled={!file || !key || busy} onClick={() => void download()}>{busy ? 'Processing…' : `Download ${format === 'image/png' ? 'PNG' : 'WebP'}`}</button></div>
		<p className="tool-message" role="status">{message}</p>
	</div>;
}
