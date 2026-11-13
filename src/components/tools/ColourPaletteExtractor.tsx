import { useEffect, useMemo, useState } from 'react';
import {
	canvasToImageData,
	canvasToBlob,
	createCanvas,
	decodeImageFile,
	downloadImage,
	formatImageBytes,
	runImageWorker,
	type DecodedImage,
} from '../../engines/image/toolkit';

type PaletteColor = { hex: string; percentage: number };

function createPalettePng(colors: PaletteColor[]): Promise<Blob> {
	const canvas = document.createElement('canvas');
	canvas.width = 700;
	canvas.height = Math.max(140, colors.length * 82 + 32);
	const context = canvas.getContext('2d');
	if (!context) return Promise.reject(new Error('Your browser could not prepare the palette image.'));
	context.fillStyle = '#ffffff';
	context.fillRect(0, 0, canvas.width, canvas.height);
	context.font = '16px sans-serif';
	colors.forEach((color, index) => {
		const top = 16 + index * 82;
		context.fillStyle = color.hex;
		context.fillRect(16, top, 668, 66);
		context.fillStyle = 0.2126 * Number.parseInt(color.hex.slice(1, 3), 16)
			+ 0.7152 * Number.parseInt(color.hex.slice(3, 5), 16)
			+ 0.0722 * Number.parseInt(color.hex.slice(5, 7), 16) < 140 ? '#ffffff' : '#1b251e';
		context.fillText(`${color.hex} · ${color.percentage.toFixed(1)}%`, 30, top + 39);
	});
	return canvasToBlob(canvas, 'image/png');
}

export default function ColourPaletteExtractor() {
	const [file, setFile] = useState<File | null>(null);
	const [source, setSource] = useState<DecodedImage | null>(null);
	const [sourceUrl, setSourceUrl] = useState('');
	const [palette, setPalette] = useState<PaletteColor[]>([]);
	const [palettePng, setPalettePng] = useState<Blob | null>(null);
	const [count, setCount] = useState(5);
	const [busy, setBusy] = useState(false);
	const [message, setMessage] = useState('Choose an image. Palette extraction runs locally in a background worker.');
	const paletteUrl = useMemo(() => palettePng ? URL.createObjectURL(palettePng) : '', [palettePng]);

	useEffect(() => () => source?.bitmap.close(), [source]);
	useEffect(() => {
		if (!file) { setSourceUrl(''); return; }
		const url = URL.createObjectURL(file);
		setSourceUrl(url);
		return () => URL.revokeObjectURL(url);
	}, [file]);
	useEffect(() => () => { if (paletteUrl) URL.revokeObjectURL(paletteUrl); }, [paletteUrl]);

	const chooseFile = async (selected?: File) => {
		setSource(null);
		setFile(null);
		setPalette([]);
		setPalettePng(null);
		if (!selected) return;
		try {
			const decoded = await decodeImageFile(selected);
			setSource(decoded);
			setFile(selected);
			setMessage(`${decoded.width.toLocaleString()} × ${decoded.height.toLocaleString()} px image ready. Choose how many colours to extract.`);
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Could not open this image. Convert it to JPG or PNG first.');
		}
	};

	const extract = async () => {
		if (!source) { setMessage('Choose an image before extracting a palette.'); return; }
		setBusy(true);
		setPalette([]);
		setPalettePng(null);
		setMessage('Sampling a downscaled copy and extracting colours in a background worker…');
		try {
			const scale = Math.min(1, 320 / Math.max(source.width, source.height));
			const width = Math.max(1, Math.round(source.width * scale));
			const height = Math.max(1, Math.round(source.height * scale));
			const canvas = createCanvas(width, height) as HTMLCanvasElement;
			const context = canvas.getContext('2d', { willReadFrequently: true });
			if (!context) throw new Error('Your browser could not prepare a palette preview.');
			context.drawImage(source.bitmap, 0, 0, width, height);
			const imageData = await canvasToImageData(canvas);
			const result = await runImageWorker({
				type: 'palette',
				data: imageData.data,
				width,
				height,
				colorCount: count,
			});
			canvas.width = 0;
			if (!result.palette?.length) throw new Error('No visible colours were found in this image.');
			const blob = await createPalettePng(result.palette);
			setPalette(result.palette);
			setPalettePng(blob);
			setMessage(`Extracted ${result.palette.length} colours. Palette PNG: 700 × ${Math.max(140, result.palette.length * 82 + 32)} px, ${formatImageBytes(blob.size)}.`);
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Could not extract colours from this image.');
		} finally {
			setBusy(false);
		}
	};

	const copy = async (value: string) => {
		try {
			await navigator.clipboard.writeText(value);
			setMessage('Palette text copied to the clipboard.');
		} catch {
			setMessage('Clipboard access is unavailable. Select and copy the palette values manually.');
		}
	};

	const downloadJson = () => {
		if (!palette.length) return;
		const blob = new Blob([JSON.stringify({ colors: palette }, null, 2)], { type: 'application/json' });
		downloadImage(blob, 'starmore-colour-palette.json');
	};

	return (
		<div>
			<div className="tool-control">
				<label htmlFor="palette-file">Choose image</label>
				<input className="image-file-input" id="palette-file" type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/bmp,.jpg,.jpeg,.png,.webp,.gif,.bmp,.heic,.heif" onChange={(event) => { void chooseFile(event.currentTarget.files?.[0]); }} />
			</div>
			{source && <p className="inline-note">Source: {source.width.toLocaleString()} × {source.height.toLocaleString()} px · {file ? formatImageBytes(file.size) : ''} · estimated palette PNG {formatImageBytes(6000 + count * 1500)}</p>}
			<div className="calc-fields" style={{ marginTop: 14 }}>
				<div className="calc-field">
					<label htmlFor="palette-count">Number of colours: {count}</label>
					<input id="palette-count" type="range" min="3" max="10" value={count} onChange={(event) => setCount(Number(event.target.value))} />
				</div>
				<div className="tool-actions" style={{ alignItems: 'end', marginTop: 0 }}>
					<button className="tool-button" type="button" disabled={!source || busy} onClick={() => void extract()}>{busy ? 'Extracting…' : 'Extract palette'}</button>
				</div>
			</div>
			{sourceUrl && <div className="tool-preview"><img src={sourceUrl} alt="Image used for palette extraction" /></div>}
			{palette.length > 0 && <div style={{ marginTop: 16 }}>
				<h3>Dominant colours</h3>
				<ul style={{ display: 'grid', gap: 8, padding: 0, listStyle: 'none' }}>
					{palette.map((color) => <li key={color.hex} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 8, border: '1px solid #e6e5dc' }}>
						<span aria-hidden="true" style={{ width: 42, height: 32, background: color.hex, border: '1px solid #ddd' }} />
						<strong style={{ flex: 1 }}>{color.hex}</strong>
						<span>{color.percentage.toFixed(1)}%</span>
						<button className="tool-button secondary" type="button" onClick={() => void copy(color.hex)}>Copy</button>
					</li>)}
				</ul>
				<div className="tool-actions">
					<button className="tool-button secondary" type="button" onClick={() => void copy(palette.map((color) => color.hex).join('\n'))}>Copy all</button>
					<button className="tool-button secondary" type="button" onClick={downloadJson}>Download JSON</button>
					<button className="tool-button secondary" type="button" disabled={!palettePng} onClick={() => palettePng && downloadImage(palettePng, 'starmore-colour-palette.png')}>Download palette PNG</button>
				</div>
				{paletteUrl && <div className="tool-preview"><img src={paletteUrl} alt="Generated dominant colour palette image" /></div>}
			</div>}
			<p className="tool-message" role="status">{message}</p>
			<p className="privacy-note">Your image files never leave your device. Colours are estimated from a downscaled copy and may vary slightly from exact pixel counts.</p>
		</div>
	);
}
