import '@fontsource/oswald/700.css';
import { useEffect, useRef, useState } from 'react';
import { decodeImageFile, downloadImage, formatImageBytes, type DecodedImage } from '../../engines/image/toolkit';
import { renderMeme, type MemeOptions, type MemeTextBox } from '../../engines/image/meme-engine';

const ACCEPTED = 'image/jpeg,image/png,image/webp,image/gif,image/bmp,.jpg,.jpeg,.png,.webp,.gif,.bmp,.heic,.heif';

export default function MemeGenerator() {
	const [file, setFile] = useState<File | null>(null);
	const [source, setSource] = useState<DecodedImage | null>(null);
	const [sourceUrl, setSourceUrl] = useState('');
	const [outputUrl, setOutputUrl] = useState('');
	const [background, setBackground] = useState('#374151');
	const [topText, setTopText] = useState('');
	const [bottomText, setBottomText] = useState('');
	const [freeTexts, setFreeTexts] = useState<MemeTextBox[]>([]);
	const [uppercase, setUppercase] = useState(true);
	const [strokeWidth, setStrokeWidth] = useState(0.08);
	const [longestSide, setLongestSide] = useState(1080);
	const [format, setFormat] = useState<'image/png' | 'image/jpeg'>('image/png');
	const [busy, setBusy] = useState(false);
	const [message, setMessage] = useState('Upload your own image or start with a plain colour. Only use images you have the right to use.');
	const dragRef = useRef<{ id: string; startX: number; startY: number; center: { x: number; y: number } } | null>(null);

	useEffect(() => () => source?.bitmap.close(), [source]);
	useEffect(() => {
		if (!file) { setSourceUrl(''); return; }
		const url = URL.createObjectURL(file);
		setSourceUrl(url);
		return () => URL.revokeObjectURL(url);
	}, [file]);
	useEffect(() => {
		if (!outputUrl) return;
		return () => URL.revokeObjectURL(outputUrl);
	}, [outputUrl]);

	const chooseFile = async (selected?: File) => {
		setFile(null);
		setSource(null);
		setOutputUrl('');
		if (!selected) return;
		try {
			const decoded = await decodeImageFile(selected);
			setFile(selected);
			setSource(decoded);
			setMessage(`${decoded.width.toLocaleString()} × ${decoded.height.toLocaleString()} px image ready. Text will fit inside the canvas.`);
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Could not open this image. Convert it to JPG or PNG first.');
		}
	};

	const dimensions = () => {
		const width = source ? source.width : 1080;
		const height = source ? source.height : 1080;
		const scale = longestSide / Math.max(width, height);
		return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
	};
	const addTextBox = () => setFreeTexts((current) => current.length >= 6 ? current : [...current, {
		id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${current.length}`,
		text: 'Your text',
		center: { x: 0.5, y: 0.5 },
		width: 0.8,
		height: 0.25,
		size: 0.08,
	}]);
	const updateTextBox = (id: string, update: Partial<MemeTextBox>) => setFreeTexts((current) => current.map((box) => box.id === id ? { ...box, ...update } : box));
	const render = async (preview = false) => {
		const { width, height } = dimensions();
		const options: MemeOptions = {
			width, height, background, topText, bottomText, freeTexts, uppercase, strokeWidth, format,
		};
		setBusy(true);
		try {
			const blob = await renderMeme(file, options);
			if (preview) setOutputUrl((previous) => {
				if (previous) URL.revokeObjectURL(previous);
				return URL.createObjectURL(blob);
			});
			else downloadImage(blob, `meme-${width}x${height}.${format === 'image/png' ? 'png' : 'jpg'}`);
			setMessage(`${preview ? 'Preview created' : 'Meme exported'} · ${width} × ${height} px · ${formatImageBytes(blob.size)}.`);
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Could not render the meme.');
		} finally {
			setBusy(false);
		}
	};

	const pointerDown = (event: React.PointerEvent<HTMLDivElement>, box: MemeTextBox) => {
		event.currentTarget.setPointerCapture(event.pointerId);
		dragRef.current = { id: box.id, startX: event.clientX, startY: event.clientY, center: box.center };
	};
	const pointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
		const drag = dragRef.current;
		if (!drag) return;
		const bounds = event.currentTarget.getBoundingClientRect();
		updateTextBox(drag.id, {
			center: {
				x: Math.max(0, Math.min(1, drag.center.x + (event.clientX - drag.startX) / bounds.width)),
				y: Math.max(0, Math.min(1, drag.center.y + (event.clientY - drag.startY) / bounds.height)),
			},
		});
	};

	return <div>
		<div className="tool-control"><label htmlFor="meme-file">Upload your own image (optional)</label><input id="meme-file" className="image-file-input" type="file" accept={ACCEPTED} onChange={(event) => { void chooseFile(event.currentTarget.files?.[0]); }} /></div>
		<p className="privacy-note">Images are processed on your device. Only use images you have the right to use. No meme template images are bundled.</p>
		<div className="calc-fields" style={{ marginTop: 14 }}>
			<div className="calc-field"><label htmlFor="meme-background">Plain background colour</label><input id="meme-background" type="color" value={background} onChange={(event) => setBackground(event.target.value)} /></div>
			<div className="calc-field"><label htmlFor="meme-top">Top text</label><textarea id="meme-top" value={topText} onChange={(event) => setTopText(event.target.value)} rows={2} maxLength={300} /></div>
			<div className="calc-field"><label htmlFor="meme-bottom">Bottom text</label><textarea id="meme-bottom" value={bottomText} onChange={(event) => setBottomText(event.target.value)} rows={2} maxLength={300} /></div>
			<div className="calc-field"><label htmlFor="meme-size">Longest side · {longestSide}px</label><select id="meme-size" value={longestSide} onChange={(event) => setLongestSide(Number(event.target.value))}><option value={1024}>1024 px</option><option value={2048}>2048 px</option><option value={3072}>3072 px</option><option value={4096}>4096 px</option></select></div>
			<div className="calc-field"><label htmlFor="meme-stroke">Outline thickness: {Math.round(strokeWidth * 100)}%</label><input id="meme-stroke" type="range" min="0" max="0.2" step="0.01" value={strokeWidth} onChange={(event) => setStrokeWidth(Number(event.target.value))} /></div>
			<div className="calc-field"><label htmlFor="meme-format">Export format</label><select id="meme-format" value={format} onChange={(event) => setFormat(event.target.value as 'image/png' | 'image/jpeg')}><option value="image/png">PNG</option><option value="image/jpeg">JPG</option></select></div>
		</div>
		<div className="tool-control"><label><input type="checkbox" checked={uppercase} onChange={(event) => setUppercase(event.target.checked)} /> Uppercase text</label></div>
		<div className="tool-control"><button className="tool-button secondary" type="button" disabled={freeTexts.length >= 6} onClick={addTextBox}>Add free text box</button></div>
		{freeTexts.map((box, index) => <div key={box.id} className="calc-fields" style={{ marginTop: 12 }}>
			<div className="calc-field"><label htmlFor={`meme-free-${box.id}`}>Free text {index + 1}</label><textarea id={`meme-free-${box.id}`} value={box.text} onChange={(event) => updateTextBox(box.id, { text: event.target.value })} rows={2} maxLength={200} /></div>
			<div className="calc-field"><label htmlFor={`meme-free-size-${box.id}`}>Text size</label><input id={`meme-free-size-${box.id}`} type="range" min="0.03" max="0.2" step="0.01" value={box.size} onChange={(event) => updateTextBox(box.id, { size: Number(event.target.value) })} /></div>
			<div className="calc-field"><label htmlFor={`meme-free-width-${box.id}`}>Box width</label><input id={`meme-free-width-${box.id}`} type="range" min="0.2" max="1" step="0.01" value={box.width} onChange={(event) => updateTextBox(box.id, { width: Number(event.target.value) })} /></div>
			<div className="calc-field"><button className="tool-button secondary" type="button" onClick={() => setFreeTexts((current) => current.filter((item) => item.id !== box.id))}>Remove text box {index + 1}</button></div>
		</div>)}
		{freeTexts.length > 0 && <div style={{ position: 'relative', width: 'min(100%, 520px)', aspectRatio: source ? `${source.width}/${source.height}` : '1', margin: '16px auto', overflow: 'hidden', background }}>
			{sourceUrl && <img src={sourceUrl} alt="Uploaded meme image preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
			{freeTexts.map((box) => <div key={box.id} onPointerDown={(event) => pointerDown(event, box)} onPointerMove={pointerMove} onPointerUp={() => { dragRef.current = null; }} onPointerCancel={() => { dragRef.current = null; }} style={{ position: 'absolute', left: `${box.center.x * 100}%`, top: `${box.center.y * 100}%`, transform: 'translate(-50%, -50%)', width: `${box.width * 100}%`, minHeight: `${box.height * 100}%`, color: '#fff', fontFamily: 'Oswald, sans-serif', fontWeight: 700, textAlign: 'center', textShadow: '-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000', touchAction: 'none', cursor: 'move', overflow: 'hidden', lineHeight: 1.1 }}>{uppercase ? box.text.toLocaleUpperCase() : box.text}</div>)}
		</div>}
		<div className="tool-actions"><button className="tool-button secondary" type="button" disabled={busy} onClick={() => void render(true)}>Preview meme</button><button className="tool-button" type="button" disabled={busy} onClick={() => void render(false)}>Export meme</button></div>
		{outputUrl && <img src={outputUrl} alt="Rendered meme preview" style={{ width: 'min(100%, 520px)', height: 'auto', display: 'block', margin: '18px auto' }} />}
		{busy && <progress className="tool-progress" max={100} value={0} aria-label="Rendering meme" />}
		<p className="tool-status" aria-live="polite">{message}</p>
	</div>;
}
