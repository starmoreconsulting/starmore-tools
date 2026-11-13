import { useEffect, useMemo, useState } from 'react';
import { zipSync } from 'fflate';
import '@fontsource/dm-sans/700.css';
import '@fontsource/inter/700.css';
import '@fontsource/lora/700.css';
import '@fontsource/merriweather/700.css';
import '@fontsource/montserrat/700.css';
import '@fontsource/playfair-display/700.css';
import {
	decodeImageFile,
	downloadImage,
	formatImageBytes,
	runImageWorker,
	type DecodedImage,
	type ImageOutputType,
} from '../../engines/image/toolkit';

type WatermarkMode = 'text' | 'logo';
type Position = 'top-left' | 'top-center' | 'top-right' | 'center-left' | 'center' | 'center-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';

const bundledFonts = ['DM Sans', 'Inter', 'Lora', 'Merriweather', 'Montserrat', 'Playfair Display'];
const positions: { id: Position; label: string }[] = [
	{ id: 'top-left', label: 'Top left' }, { id: 'top-center', label: 'Top centre' }, { id: 'top-right', label: 'Top right' },
	{ id: 'center-left', label: 'Middle left' }, { id: 'center', label: 'Centre' }, { id: 'center-right', label: 'Middle right' },
	{ id: 'bottom-left', label: 'Bottom left' }, { id: 'bottom-center', label: 'Bottom centre' }, { id: 'bottom-right', label: 'Bottom right' },
];

export default function ImageWatermarkGenerator() {
	const [files, setFiles] = useState<File[]>([]);
	const [inputUrl, setInputUrl] = useState('');
	const [logoFile, setLogoFile] = useState<File | null>(null);
	const [logo, setLogo] = useState<DecodedImage | null>(null);
	const [mode, setMode] = useState<WatermarkMode>('text');
	const [text, setText] = useState('© Starmore');
	const [font, setFont] = useState(bundledFonts[0]);
	const [size, setSize] = useState(12);
	const [color, setColor] = useState('#FFFFFF');
	const [opacity, setOpacity] = useState(45);
	const [rotation, setRotation] = useState(-25);
	const [position, setPosition] = useState<Position>('bottom-right');
	const [repeat, setRepeat] = useState(false);
	const [spacing, setSpacing] = useState(12);
	const [format, setFormat] = useState<ImageOutputType>('image/png');
	const [quality, setQuality] = useState(90);
	const [preview, setPreview] = useState<Blob | null>(null);
	const [previewUrl, setPreviewUrl] = useState('');
	const [compare, setCompare] = useState(50);
	const [busy, setBusy] = useState(false);
	const [progress, setProgress] = useState(0);
	const [message, setMessage] = useState('Choose one or more images. Watermarks are rendered locally in a background worker.');
	const estimatedBytes = useMemo(() => files.reduce((total, file) => total + Math.round(file.size * (format === 'image/png' ? 1.4 : 0.65 * quality / 90)), 0), [files, format, quality]);

	useEffect(() => {
		if (!files.length) { setInputUrl(''); return; }
		const url = URL.createObjectURL(files[0]);
		setInputUrl(url);
		return () => URL.revokeObjectURL(url);
	}, [files]);
	useEffect(() => () => logo?.bitmap.close(), [logo]);
	useEffect(() => {
		if (!preview) { setPreviewUrl(''); return; }
		const url = URL.createObjectURL(preview);
		setPreviewUrl(url);
		return () => URL.revokeObjectURL(url);
	}, [preview]);

	const chooseLogo = async (file?: File) => {
		setLogo(null);
		setLogoFile(file ?? null);
		if (!file) return;
		try {
			setLogo(await decodeImageFile(file));
			setMessage('Watermark logo loaded locally.');
		} catch (error) {
			setLogoFile(null);
			setMessage(error instanceof Error ? error.message : 'Could not open this watermark image.');
		}
	};

	const processImages = async () => {
		if (!files.length) { setMessage('Choose at least one image before adding a watermark.'); return; }
		if (mode === 'logo' && !logo) { setMessage('Choose a logo/image watermark first.'); return; }
		if (mode === 'text' && !text.trim()) { setMessage('Enter watermark text first.'); return; }
		setBusy(true);
		setProgress(0);
		setPreview(null);
		setMessage(`Adding a visible watermark to ${files.length} image${files.length === 1 ? '' : 's'} in background workers…`);
		try {
			await document.fonts.load(`700 40px "${font}"`);
			const archive: Record<string, Uint8Array> = {};
			let firstPreview: Blob | null = null;
			for (let index = 0; index < files.length; index += 1) {
				const source = await decodeImageFile(files[index]);
				const logoBitmap = mode === 'logo' && logo ? await createImageBitmap(logo.bitmap) : undefined;
				try {
					const result = await runImageWorker({
						type: 'watermark',
						source: source.bitmap,
						logo: logoBitmap,
						mode,
						text: text.trim(),
						font,
						color,
						size,
						opacity,
						rotation,
						position,
						repeat,
						spacing: Math.round(Math.min(source.width, source.height) * spacing / 100),
						outputType: format,
						quality,
						jpgBackground: '#ffffff',
					}, (update) => setProgress(Math.round((index + (update.total ? update.completed / update.total : 0)) * 100 / files.length)));
					if (!result.blob) throw new Error('The watermark worker returned no image.');
					if (index === 0) firstPreview = result.blob;
					const extension = format === 'image/jpeg' ? 'jpg' : format.slice(6);
					const safeName = files[index].name.replace(/\.[^.]+$/, '').replace(/[^a-z0-9_-]+/gi, '-').slice(0, 80) || `image-${index + 1}`;
					archive[`${safeName}-watermarked.${extension}`] = new Uint8Array(await result.blob.arrayBuffer());
					setProgress(Math.round((index + 1) * 100 / files.length));
				} finally {
					logoBitmap?.close();
				}
			}
			const zipped = zipSync(archive, { level: 5 });
			const zip = new Blob([zipped], { type: 'application/zip' });
			setPreview(firstPreview);
			downloadImage(zip, 'starmore-watermarked-images.zip');
			setMessage(`Applied visible watermarks and downloaded ${files.length} image${files.length === 1 ? '' : 's'} as a ${formatImageBytes(zip.size)} ZIP.`);
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Could not add the watermark to these images.');
		} finally {
			setBusy(false);
		}
	};

	return (
		<div>
			<div className="tool-control">
				<label htmlFor="watermark-files">Images (select several)</label>
				<input className="image-file-input" id="watermark-files" type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif,image/bmp,.jpg,.jpeg,.png,.webp,.gif,.bmp,.heic,.heif" onChange={(event) => {
					setFiles(Array.from(event.currentTarget.files ?? []));
					setPreview(null);
				}} />
			</div>
			{files.length > 0 && <p className="inline-note">{files.length} image{files.length === 1 ? '' : 's'} selected · same dimensions as source · estimated combined output {formatImageBytes(estimatedBytes)}</p>}
			<div className="calc-field" style={{ marginTop: 14 }}>
				<label htmlFor="watermark-mode">Watermark type</label>
				<select id="watermark-mode" value={mode} onChange={(event) => setMode(event.target.value as WatermarkMode)}>
					<option value="text">Text</option><option value="logo">Logo / image</option>
				</select>
			</div>
			{mode === 'text' ? <div className="calc-fields" style={{ marginTop: 14 }}>
				<div className="calc-field">
					<label htmlFor="watermark-text">Watermark text</label>
					<input id="watermark-text" value={text} maxLength={100} onChange={(event) => setText(event.target.value)} />
				</div>
				<div className="calc-field">
					<label htmlFor="watermark-font">Bundled font</label>
					<select id="watermark-font" value={font} onChange={(event) => setFont(event.target.value)}>
						{bundledFonts.map((family) => <option key={family} value={family}>{family}</option>)}
					</select>
				</div>
				<div className="calc-field">
					<label htmlFor="watermark-color">Text colour</label>
					<input id="watermark-color" type="color" value={color} onChange={(event) => setColor(event.target.value)} />
				</div>
			</div> : <div className="tool-control" style={{ marginTop: 14 }}>
				<label htmlFor="watermark-logo">Watermark logo/image</label>
				<input className="image-file-input" id="watermark-logo" type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/bmp,.jpg,.jpeg,.png,.webp,.gif,.bmp" onChange={(event) => { void chooseLogo(event.currentTarget.files?.[0]); }} />
				{logoFile && <p className="inline-note">{logoFile.name} loaded locally.</p>}
			</div>}
			<div className="calc-fields" style={{ marginTop: 14 }}>
				<div className="calc-field">
					<label htmlFor="watermark-size">Size: {size}% of the shorter image side</label>
					<input id="watermark-size" type="range" min="5" max="35" value={size} onChange={(event) => setSize(Number(event.target.value))} />
				</div>
				<div className="calc-field">
					<label htmlFor="watermark-opacity">Opacity: {opacity}%</label>
					<input id="watermark-opacity" type="range" min="5" max="100" value={opacity} onChange={(event) => setOpacity(Number(event.target.value))} />
				</div>
				<div className="calc-field">
					<label htmlFor="watermark-rotation">Rotation: {rotation}°</label>
					<input id="watermark-rotation" type="range" min="-180" max="180" value={rotation} onChange={(event) => setRotation(Number(event.target.value))} />
				</div>
				<div className="calc-field">
					<label htmlFor="watermark-position">Position</label>
					<select id="watermark-position" value={position} onChange={(event) => setPosition(event.target.value as Position)}>
						{positions.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
					</select>
				</div>
				<div className="calc-field">
					<label htmlFor="watermark-format">Output format</label>
					<select id="watermark-format" value={format} onChange={(event) => setFormat(event.target.value as ImageOutputType)}>
						<option value="image/png">PNG</option><option value="image/jpeg">JPG</option><option value="image/webp">WebP</option>
					</select>
				</div>
			</div>
			<label className="tool-choice" style={{ marginTop: 14 }}>
				<input type="checkbox" checked={repeat} onChange={(event) => setRepeat(event.target.checked)} />
				<span>Tile / repeat watermark</span>
			</label>
			{repeat && <div className="tool-control" style={{ marginTop: 12 }}>
				<label htmlFor="watermark-spacing">Tile spacing: {spacing}%</label>
				<input id="watermark-spacing" type="range" min="5" max="40" value={spacing} onChange={(event) => setSpacing(Number(event.target.value))} />
			</div>}
			<div className="tool-actions">
				<button className="tool-button" type="button" disabled={!files.length || busy} onClick={() => void processImages()}>{busy ? 'Watermarking…' : 'Apply watermark and download ZIP'}</button>
			</div>
			{busy && <progress aria-label="Watermark processing progress" max={100} value={progress} />}
			{inputUrl && <div className="tool-preview" style={{ display: 'block' }}>
				<div style={{ position: 'relative', width: '100%', height: 'min(60vw, 360px)', minHeight: 160, overflow: 'hidden' }}>
					<img src={previewUrl || inputUrl} alt={previewUrl ? 'Watermarked image preview' : 'Original image preview'} style={{ width: '100%', height: '100%', maxWidth: 'none', maxHeight: 'none', objectFit: 'contain' }} />
					{previewUrl && <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', clipPath: `inset(0 ${100 - compare}% 0 0)` }}><img src={inputUrl} alt="Original image comparison" style={{ width: '100%', height: '100%', maxWidth: 'none', maxHeight: 'none', objectFit: 'contain' }} /></div>}
				</div>
				{previewUrl && <label style={{ display: 'block', marginTop: 10 }}><span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>Compare original image</span><input style={{ width: '100%' }} type="range" min="0" max="100" value={compare} onChange={(event) => setCompare(Number(event.target.value))} /></label>}
			</div>}
			<p className="tool-message" role="status">{message}</p>
			<p className="privacy-note">This tool adds a visible watermark to image pixels. Your files never leave your device; watermark rendering happens in a background worker.</p>
		</div>
	);
}
