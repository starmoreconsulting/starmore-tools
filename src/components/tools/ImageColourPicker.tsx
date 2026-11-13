import { useEffect, useRef, useState } from 'react';
import { decodeImageFile, formatImageBytes, type DecodedImage } from '../../engines/image/toolkit';

type Pick = { hex: string; rgb: string; hsl: string };
type EyeDropperWindow = Window & { EyeDropper?: new () => { open(): Promise<{ sRGBHex: string }> } };

function toHex(red: number, green: number, blue: number): string {
	return `#${[red, green, blue].map((value) => value.toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

function toHsl(red: number, green: number, blue: number): string {
	const r = red / 255;
	const g = green / 255;
	const b = blue / 255;
	const high = Math.max(r, g, b);
	const low = Math.min(r, g, b);
	const delta = high - low;
	let hue = 0;
	if (delta) {
		if (high === r) hue = ((g - b) / delta) % 6;
		else if (high === g) hue = (b - r) / delta + 2;
		else hue = (r - g) / delta + 4;
	}
	hue = (hue * 60 + 360) % 360;
	const lightness = (high + low) / 2;
	const saturation = delta ? delta / (1 - Math.abs(2 * lightness - 1)) : 0;
	return `hsl(${Math.round(hue)}, ${Math.round(saturation * 100)}%, ${Math.round(lightness * 100)}%)`;
}

function parseHex(hex: string): Pick {
	const normalized = hex.replace('#', '');
	const red = Number.parseInt(normalized.slice(0, 2), 16);
	const green = Number.parseInt(normalized.slice(2, 4), 16);
	const blue = Number.parseInt(normalized.slice(4, 6), 16);
	return { hex: toHex(red, green, blue), rgb: `rgb(${red}, ${green}, ${blue})`, hsl: toHsl(red, green, blue) };
}

export default function ImageColourPicker() {
	const [file, setFile] = useState<File | null>(null);
	const [image, setImage] = useState<DecodedImage | null>(null);
	const [imageUrl, setImageUrl] = useState('');
	const [picked, setPicked] = useState<Pick | null>(null);
	const [history, setHistory] = useState<Pick[]>([]);
	const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
	const [message, setMessage] = useState('Choose an image and tap or click any pixel to inspect its colour.');
	const [eyeDropperAvailable, setEyeDropperAvailable] = useState(false);
	const imageCanvas = useRef<HTMLCanvasElement>(null);
	const loupeCanvas = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		setEyeDropperAvailable('EyeDropper' in window);
	}, []);
	useEffect(() => () => image?.bitmap.close(), [image]);
	useEffect(() => {
		if (!image) { setImageUrl(''); return; }
		const canvas = document.createElement('canvas');
		canvas.width = image.width;
		canvas.height = image.height;
		const context = canvas.getContext('2d', { willReadFrequently: true });
		if (!context) { setMessage('Your browser could not prepare the image preview.'); return; }
		context.drawImage(image.bitmap, 0, 0);
		canvas.toBlob((blob) => {
			if (blob) {
				const url = URL.createObjectURL(blob);
				setImageUrl((previous) => {
					if (previous) URL.revokeObjectURL(previous);
					return url;
				});
			} else setMessage('Your browser could not prepare the image preview.');
			canvas.width = 0;
			canvas.height = 0;
		}, 'image/png');
		return () => {
			if (imageUrl) URL.revokeObjectURL(imageUrl);
		};
	}, [image]);
	useEffect(() => {
		const canvas = imageCanvas.current;
		if (!canvas || !image) return;
		canvas.width = image.width;
		canvas.height = image.height;
		const context = canvas.getContext('2d', { willReadFrequently: true });
		if (context) context.drawImage(image.bitmap, 0, 0);
	}, [image]);

	const chooseFile = async (selected?: File) => {
		setImage(null);
		setFile(null);
		setPicked(null);
		setHistory([]);
		setCursor(null);
		if (!selected) return;
		try {
			const decoded = await decodeImageFile(selected);
			setImage(decoded);
			setFile(selected);
			setMessage(`${decoded.width.toLocaleString()} × ${decoded.height.toLocaleString()} px image ready. Click or tap a colour.`);
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Could not open this image. Convert it to JPG or PNG first.');
		}
	};

	const rememberPick = (color: Pick) => {
		setPicked(color);
		setHistory((previous) => [color, ...previous].slice(0, 10));
		setMessage(`Picked ${color.hex}.`);
	};

	const readAt = (clientX: number, clientY: number, record: boolean) => {
		const canvas = imageCanvas.current;
		const imageElement = document.getElementById('colour-picker-image');
		if (!canvas || !image || !imageElement) return;
		const bounds = imageElement.getBoundingClientRect();
		const x = Math.max(0, Math.min(image.width - 1, Math.floor((clientX - bounds.left) * image.width / bounds.width)));
		const y = Math.max(0, Math.min(image.height - 1, Math.floor((clientY - bounds.top) * image.height / bounds.height)));
		const context = canvas.getContext('2d', { willReadFrequently: true });
		if (!context) { setMessage('Your browser could not read image pixels.'); return; }
		try {
			const [red, green, blue] = context.getImageData(x, y, 1, 1).data;
			const color = { hex: toHex(red, green, blue), rgb: `rgb(${red}, ${green}, ${blue})`, hsl: toHsl(red, green, blue) };
			setCursor({ x, y });
			if (record) rememberPick(color);
			const loupe = loupeCanvas.current;
			const loupeContext = loupe?.getContext('2d');
			if (loupe && loupeContext) {
				loupe.width = 110;
				loupe.height = 110;
				const zoom = 11;
				const sampleSize = Math.max(1, Math.floor(110 / zoom));
				const sampleX = Math.max(0, Math.min(image.width - sampleSize, x - Math.floor(sampleSize / 2)));
				const sampleY = Math.max(0, Math.min(image.height - sampleSize, y - Math.floor(sampleSize / 2)));
				loupeContext.imageSmoothingEnabled = false;
				loupeContext.clearRect(0, 0, loupe.width, loupe.height);
				loupeContext.drawImage(canvas, sampleX, sampleY, sampleSize, sampleSize, 0, 0, loupe.width, loupe.height);
				loupeContext.strokeStyle = '#d7ed79';
				loupeContext.lineWidth = 2;
				loupeContext.strokeRect(Math.floor(loupe.width / 2) - zoom / 2, Math.floor(loupe.height / 2) - zoom / 2, zoom, zoom);
			}
		} catch {
			setMessage('Could not read the selected pixel from this image.');
		}
	};

	const pickWithEyeDropper = async () => {
		const EyeDropper = (window as EyeDropperWindow).EyeDropper;
		if (!EyeDropper) return;
		try {
			const result = await new EyeDropper().open();
			rememberPick(parseHex(result.sRGBHex));
		} catch (error) {
			if (error instanceof Error && error.name !== 'AbortError') setMessage('The browser could not use its colour picker. Click the image to pick a pixel instead.');
		}
	};

	const copy = async (value: string) => {
		try {
			await navigator.clipboard.writeText(value);
			setMessage(`Copied ${value}.`);
		} catch {
			setMessage('Clipboard access is unavailable. Select and copy the colour value manually.');
		}
	};

	return (
		<div>
			<div className="tool-control">
				<label htmlFor="colour-picker-file">Choose image</label>
				<input className="image-file-input" id="colour-picker-file" type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/bmp,.jpg,.jpeg,.png,.webp,.gif,.bmp,.heic,.heif" onChange={(event) => { void chooseFile(event.currentTarget.files?.[0]); }} />
			</div>
			{image && <p className="inline-note">Image size: {image.width.toLocaleString()} × {image.height.toLocaleString()} px · source file {file ? formatImageBytes(file.size) : ''}</p>}
			{imageUrl && <div className="tool-preview" style={{ display: 'block' }}>
				<div style={{ position: 'relative', width: 'fit-content', maxWidth: '100%', margin: '0 auto' }}>
					<img id="colour-picker-image" src={imageUrl} alt="Image to pick colours from" onPointerMove={(event) => readAt(event.clientX, event.clientY, false)} onPointerLeave={() => setCursor(null)} onClick={(event) => readAt(event.clientX, event.clientY, true)} style={{ display: 'block', maxWidth: '100%', maxHeight: 420, width: 'auto', height: 'auto', cursor: 'crosshair', touchAction: 'manipulation' }} />
					{cursor && <canvas ref={loupeCanvas} aria-hidden="true" style={{ position: 'absolute', top: 8, right: 8, width: 110, height: 110, border: '2px solid #fff', borderRadius: '50%', boxShadow: '0 2px 8px #0005', imageRendering: 'pixelated', pointerEvents: 'none' }} />}
				</div>
			</div>}
			<canvas ref={imageCanvas} style={{ display: 'none' }} aria-hidden="true" />
			{picked && <div className="calc-fields" style={{ marginTop: 16 }}>
				<div className="calc-field">
					<label>HEX</label><div className="tool-actions"><input readOnly value={picked.hex} /><button className="tool-button secondary" type="button" onClick={() => void copy(picked.hex)}>Copy</button></div>
				</div>
				<div className="calc-field">
					<label>RGB</label><div className="tool-actions"><input readOnly value={picked.rgb} /><button className="tool-button secondary" type="button" onClick={() => void copy(picked.rgb)}>Copy</button></div>
				</div>
				<div className="calc-field">
					<label>HSL</label><div className="tool-actions"><input readOnly value={picked.hsl} /><button className="tool-button secondary" type="button" onClick={() => void copy(picked.hsl)}>Copy</button></div>
				</div>
			</div>}
			<div className="tool-actions">
				{eyeDropperAvailable && <button className="tool-button secondary" type="button" onClick={() => void pickWithEyeDropper()}>Use browser EyeDropper</button>}
				{picked && <span className="inline-note" style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}><span style={{ width: 20, height: 20, border: '1px solid #777', background: picked.hex }} />Current sample</span>}
			</div>
			{history.length > 0 && <div style={{ marginTop: 18 }}>
				<h3>Recent picks</h3>
				<div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
					{history.map((item, index) => <button key={`${item.hex}-${index}`} type="button" title={item.hex} aria-label={`Pick ${item.hex}`} onClick={() => rememberPick(item)} style={{ width: 42, height: 42, border: '1px solid #758075', background: item.hex, cursor: 'pointer' }} />)}
				</div>
			</div>}
			<p className="tool-message" role="status">{message}</p>
			<p className="privacy-note">Your image files never leave your device. The sampled pixel and colour conversions are read locally in your browser.</p>
		</div>
	);
}
