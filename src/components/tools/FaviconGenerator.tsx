import { useEffect, useState } from 'react';
import { zipSync } from 'fflate';
import {
	canvasToBlob,
	decodeImageFile,
	downloadImage,
	formatImageBytes,
	type DecodedImage,
} from '../../engines/image/toolkit';

type Shape = 'square' | 'rounded' | 'circle';
type FaviconFile = { name: string; blob: Blob; bytes: Uint8Array };

const iconSizes = [16, 32, 48, 180, 192, 512];

function roundedRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
	context.beginPath();
	context.moveTo(x + radius, y);
	context.arcTo(x + width, y, x + width, y + height, radius);
	context.arcTo(x + width, y + height, x, y + height, radius);
	context.arcTo(x, y + height, x, y, radius);
	context.arcTo(x, y, x + width, y, radius);
	context.closePath();
}

function drawFavicon(context: CanvasRenderingContext2D, size: number, source: DecodedImage | null, kind: 'image' | 'text' | 'emoji', text: string, shape: Shape, background: string, foreground: string, padding: number): void {
	context.clearRect(0, 0, size, size);
	const inset = size * padding / 100;
	const contentSize = Math.max(1, size - inset * 2);
	context.save();
	context.fillStyle = background;
	if (shape === 'circle') {
		context.beginPath();
		context.arc(size / 2, size / 2, contentSize / 2, 0, Math.PI * 2);
		context.fill();
	} else if (shape === 'rounded') {
		roundedRect(context, inset, inset, contentSize, contentSize, contentSize * 0.22);
		context.fill();
	} else {
		context.fillRect(inset, inset, contentSize, contentSize);
	}
	if (kind === 'image' && source) {
		const scale = Math.min(contentSize / source.width, contentSize / source.height);
		const width = source.width * scale;
		const height = source.height * scale;
		context.beginPath();
		if (shape === 'circle') {
			context.arc(size / 2, size / 2, contentSize / 2, 0, Math.PI * 2);
		} else if (shape === 'rounded') {
			roundedRect(context, inset, inset, contentSize, contentSize, contentSize * 0.22);
		} else {
			context.rect(inset, inset, contentSize, contentSize);
		}
		context.clip();
		context.drawImage(source.bitmap, (size - width) / 2, (size - height) / 2, width, height);
	} else {
		context.fillStyle = foreground;
		context.textAlign = 'center';
		context.textBaseline = 'middle';
		context.font = `700 ${contentSize * (kind === 'emoji' ? 0.78 : 0.62)}px ${kind === 'emoji' ? 'system-ui, Apple Color Emoji, Segoe UI Emoji' : 'Arial, sans-serif'}`;
		context.fillText((text || (kind === 'emoji' ? '✨' : 'S')).slice(0, 4), size / 2, size / 2, contentSize * 0.88);
	}
	context.restore();
}

async function createIco(entries: FaviconFile[]): Promise<Blob> {
	const directorySize = 6 + entries.length * 16;
	const totalSize = directorySize + entries.reduce((sum, entry) => sum + entry.bytes.length, 0);
	const bytes = new Uint8Array(totalSize);
	const view = new DataView(bytes.buffer);
	view.setUint16(0, 0, true);
	view.setUint16(2, 1, true);
	view.setUint16(4, entries.length, true);
	let offset = directorySize;
	entries.forEach((entry, index) => {
		const size = Number(entry.name.match(/\d+/)?.[0] ?? 0);
		const cursor = 6 + index * 16;
		bytes[cursor] = size >= 256 ? 0 : size;
		bytes[cursor + 1] = size >= 256 ? 0 : size;
		bytes[cursor + 2] = 0;
		bytes[cursor + 3] = 0;
		view.setUint16(cursor + 4, 1, true);
		view.setUint16(cursor + 6, 32, true);
		view.setUint32(cursor + 8, entry.bytes.length, true);
		view.setUint32(cursor + 12, offset, true);
		bytes.set(entry.bytes, offset);
		offset += entry.bytes.length;
	});
	return new Blob([bytes], { type: 'image/x-icon' });
}

export default function FaviconGenerator() {
	const [kind, setKind] = useState<'image' | 'text' | 'emoji'>('text');
	const [file, setFile] = useState<File | null>(null);
	const [source, setSource] = useState<DecodedImage | null>(null);
	const [text, setText] = useState('S');
	const [shape, setShape] = useState<Shape>('rounded');
	const [background, setBackground] = useState('#55744D');
	const [foreground, setForeground] = useState('#FFFFFF');
	const [padding, setPadding] = useState(12);
	const [zip, setZip] = useState<Blob | null>(null);
	const [snippet, setSnippet] = useState('');
	const [message, setMessage] = useState('Create a favicon from an image, text or emoji. Everything stays on your device.');
	const [previewUrl, setPreviewUrl] = useState('');

	useEffect(() => () => source?.bitmap.close(), [source]);
	useEffect(() => {
		const canvas = document.createElement('canvas');
		canvas.width = 128;
		canvas.height = 128;
		const context = canvas.getContext('2d');
		if (!context) return;
		drawFavicon(context, 128, source, kind, text, shape, background, foreground, padding);
		canvas.toBlob((blob) => {
			if (!blob) return;
			const url = URL.createObjectURL(blob);
			setPreviewUrl((previous) => {
				if (previous) URL.revokeObjectURL(previous);
				return url;
			});
			canvas.width = 0;
			canvas.height = 0;
		}, 'image/png');
		return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
	}, [source, kind, text, shape, background, foreground, padding]);

	const chooseFile = async (selected?: File) => {
		setSource(null);
		setFile(null);
		setZip(null);
		if (!selected) return;
		try {
			const decoded = await decodeImageFile(selected);
			setSource(decoded);
			setFile(selected);
			setKind('image');
			setMessage(`${decoded.width.toLocaleString()} × ${decoded.height.toLocaleString()} px image loaded.`);
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Could not open this image. Convert it to JPG or PNG first.');
		}
	};

	const createBundle = async () => {
		if (kind === 'image' && !source) { setMessage('Choose an image before generating image-based favicons.'); return; }
		if (kind !== 'image' && !text.trim()) { setMessage(kind === 'emoji' ? 'Enter an emoji first.' : 'Enter a short letter or text first.'); return; }
		setZip(null);
		setMessage('Rendering icon sizes and building a local ZIP…');
		try {
			const pngFiles: FaviconFile[] = [];
			for (const size of iconSizes) {
				const canvas = document.createElement('canvas');
				canvas.width = size;
				canvas.height = size;
				const context = canvas.getContext('2d');
				if (!context) throw new Error('Your browser could not prepare an icon canvas.');
				drawFavicon(context, size, source, kind, text, shape, background, foreground, padding);
				const blob = await canvasToBlob(canvas, 'image/png');
				pngFiles.push({ name: `icon-${size}.png`, blob, bytes: new Uint8Array(await blob.arrayBuffer()) });
				canvas.width = 0;
				canvas.height = 0;
			}
			const icoEntries = pngFiles.filter((entry) => [16, 32, 48].some((size) => entry.name === `icon-${size}.png`));
			const ico = await createIco(icoEntries);
			const icoBytes = new Uint8Array(await ico.arrayBuffer());
			const manifest = {
				name: 'My Website',
				short_name: 'Website',
				icons: [
					{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
					{ src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
				],
				theme_color: background,
				background_color: background,
				display: 'standalone',
			};
			const html = [
				'<link rel="icon" href="/favicon.ico" sizes="any">',
				'<link rel="icon" type="image/png" sizes="32x32" href="/icon-32.png">',
				'<link rel="apple-touch-icon" href="/icon-180.png">',
				'<link rel="manifest" href="/site.webmanifest">',
			].join('\n');
			const files: Record<string, Uint8Array> = {
				'favicon.ico': icoBytes,
				'site.webmanifest': new TextEncoder().encode(JSON.stringify(manifest, null, 2)),
				'index.html-snippet.txt': new TextEncoder().encode(html),
			};
			for (const entry of pngFiles) files[entry.name] = entry.bytes;
			const zipped = zipSync(files, { level: 6 });
			const blob = new Blob([zipped], { type: 'application/zip' });
			setZip(blob);
			setSnippet(html);
			setMessage(`Created multi-size favicon ZIP (${formatImageBytes(blob.size)}). ICO contains 16, 32 and 48 px PNG entries.`);
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Could not generate the favicon files.');
		}
	};

	const copySnippet = async () => {
		try {
			await navigator.clipboard.writeText(snippet);
			setMessage('HTML snippet copied.');
		} catch {
			setMessage('Clipboard access is unavailable. Select and copy the HTML snippet manually.');
		}
	};

	return (
		<div>
			<div className="calc-field">
				<label htmlFor="favicon-kind">Create favicon from</label>
				<select id="favicon-kind" value={kind} onChange={(event) => {
					const nextKind = event.target.value as typeof kind;
					setKind(nextKind);
					if (nextKind === 'emoji') setText('✨');
					else if (nextKind === 'text') setText('S');
					setZip(null);
				}}>
					<option value="image">Image</option><option value="text">Text</option><option value="emoji">Emoji</option>
				</select>
			</div>
			{kind === 'image' ? <div className="tool-control" style={{ marginTop: 14 }}>
				<label htmlFor="favicon-file">Choose image</label>
				<input className="image-file-input" id="favicon-file" type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/bmp,.jpg,.jpeg,.png,.webp,.gif,.bmp,.heic,.heif" onChange={(event) => { void chooseFile(event.currentTarget.files?.[0]); }} />
			</div> : <div className="calc-field" style={{ marginTop: 14 }}>
				<label htmlFor="favicon-text">{kind === 'emoji' ? 'Emoji' : 'Text (up to 4 characters)'}</label>
				<input id="favicon-text" value={text} maxLength={4} onChange={(event) => { setText(event.target.value); setZip(null); }} />
			</div>}
			<div className="calc-fields" style={{ marginTop: 14 }}>
				<div className="calc-field">
					<label htmlFor="favicon-shape">Background shape</label>
					<select id="favicon-shape" value={shape} onChange={(event) => { setShape(event.target.value as Shape); setZip(null); }}>
						<option value="square">Square</option><option value="rounded">Rounded</option><option value="circle">Circle</option>
					</select>
				</div>
				<div className="calc-field">
					<label htmlFor="favicon-padding">Padding: {padding}%</label>
					<input id="favicon-padding" type="range" min="0" max="35" value={padding} onChange={(event) => { setPadding(Number(event.target.value)); setZip(null); }} />
				</div>
				<div className="calc-field">
					<label htmlFor="favicon-background">Background colour</label>
					<input id="favicon-background" type="color" value={background} onChange={(event) => { setBackground(event.target.value.toUpperCase()); setZip(null); }} />
				</div>
				{kind !== 'image' && <div className="calc-field">
					<label htmlFor="favicon-foreground">Text colour</label>
					<input id="favicon-foreground" type="color" value={foreground} onChange={(event) => { setForeground(event.target.value.toUpperCase()); setZip(null); }} />
				</div>}
			</div>
			{previewUrl && <div className="tool-preview"><img src={previewUrl} alt="Favicon preview" style={{ width: 128, height: 128, imageRendering: 'pixelated' }} /></div>}
			<p className="inline-note">Output: PNG icons at 16, 32, 48, 180, 192 and 512 px plus favicon.ico, site.webmanifest and an HTML snippet. Estimated ZIP size: about 100 KB.</p>
			<div className="tool-actions">
				<button className="tool-button" type="button" onClick={() => void createBundle()}>Generate favicon ZIP</button>
				<button className="tool-button secondary" type="button" disabled={!zip} onClick={() => zip && downloadImage(zip, 'starmore-favicon-kit.zip')}>Download ZIP</button>
			</div>
			{snippet && <div className="calc-field" style={{ marginTop: 14 }}>
				<label htmlFor="favicon-html-snippet">HTML snippet</label>
				<textarea id="favicon-html-snippet" readOnly rows={4} value={snippet} />
				<button className="tool-button secondary" type="button" onClick={() => void copySnippet()}>Copy HTML snippet</button>
			</div>}
			<p className="tool-message" role="status">{message}</p>
			<p className="privacy-note">Your images never leave your device. Icons, ICO and ZIP files are generated entirely in your browser.</p>
		</div>
	);
}
