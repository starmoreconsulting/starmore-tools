import { useEffect, useState } from 'react';
import { decodeImageFile, downloadImage, formatImageBytes, type DecodedImage } from '../../engines/image/toolkit';
import { renderScreenshotBeautification, type ScreenshotBackground, type ScreenshotFrame } from '../../engines/image/screenshot-engine';

const ACCEPTED = 'image/jpeg,image/png,image/webp,image/gif,image/bmp,.jpg,.jpeg,.png,.webp,.gif,.bmp,.heic,.heif';
const gradientPresets = [
	{ name: 'Sunrise', start: '#f97316', end: '#ec4899' },
	{ name: 'Ocean', start: '#0ea5e9', end: '#4338ca' },
	{ name: 'Mint', start: '#34d399', end: '#0891b2' },
	{ name: 'Lavender', start: '#a78bfa', end: '#f0abfc' },
];

export default function ScreenshotBeautifier() {
	const [file, setFile] = useState<File | null>(null);
	const [source, setSource] = useState<DecodedImage | null>(null);
	const [sourceUrl, setSourceUrl] = useState('');
	const [backgroundFile, setBackgroundFile] = useState<File | undefined>();
	const [backgroundPreviewUrl, setBackgroundPreviewUrl] = useState('');
	const [background, setBackground] = useState<ScreenshotBackground>({ kind: 'gradient', start: gradientPresets[0].start, end: gradientPresets[0].end });
	const [padding, setPadding] = useState(64);
	const [radius, setRadius] = useState(18);
	const [shadow, setShadow] = useState(true);
	const [shadowBlur, setShadowBlur] = useState(32);
	const [shadowOffset, setShadowOffset] = useState(16);
	const [frame, setFrame] = useState<ScreenshotFrame>('none');
	const [scale, setScale] = useState<1 | 2 | 4>(1);
	const [format, setFormat] = useState<'image/png' | 'image/webp'>('image/png');
	const [outputUrl, setOutputUrl] = useState('');
	const [busy, setBusy] = useState(false);
	const [message, setMessage] = useState('Paste with Ctrl+V or upload a screenshot. Everything stays on your device.');

	useEffect(() => () => source?.bitmap.close(), [source]);
	useEffect(() => {
		if (!file) { setSourceUrl(''); return; }
		const url = URL.createObjectURL(file);
		setSourceUrl(url);
		return () => URL.revokeObjectURL(url);
	}, [file]);
	useEffect(() => {
		if (!backgroundFile) { setBackgroundPreviewUrl(''); return; }
		const url = URL.createObjectURL(backgroundFile);
		setBackgroundPreviewUrl(url);
		return () => URL.revokeObjectURL(url);
	}, [backgroundFile]);
	useEffect(() => {
		if (!outputUrl) return;
		return () => URL.revokeObjectURL(outputUrl);
	}, [outputUrl]);
	useEffect(() => {
		const onPaste = (event: ClipboardEvent) => {
			const pasted = Array.from(event.clipboardData?.files ?? []).find((item) => item.type.startsWith('image/'));
			if (pasted) {
				event.preventDefault();
				void chooseFile(pasted);
			}
		};
		window.addEventListener('paste', onPaste);
		return () => window.removeEventListener('paste', onPaste);
	}, []);

	const chooseFile = async (selected?: File) => {
		setFile(null);
		setSource(null);
		setOutputUrl('');
		if (!selected) return;
		try {
			const decoded = await decodeImageFile(selected);
			setFile(selected);
			setSource(decoded);
			setMessage(`${decoded.width.toLocaleString()} × ${decoded.height.toLocaleString()} px screenshot ready.`);
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Could not open this screenshot. Convert it to PNG or JPG first.');
		}
	};

	const pasteFromClipboard = async () => {
		try {
			if (!navigator.clipboard?.read) throw new Error('Clipboard image access is unavailable here. Use Ctrl+V or upload a file.');
			const items = await navigator.clipboard.read();
			for (const item of items) {
				const imageType = item.types.find((type) => type.startsWith('image/'));
				if (imageType) {
					const blob = await item.getType(imageType);
					await chooseFile(new File([blob], 'pasted-screenshot', { type: imageType }));
					return;
				}
			}
			throw new Error('No image was found on the clipboard. Copy a screenshot and try again.');
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Could not read an image from the clipboard.');
		}
	};

	const exportImage = async (preview = false) => {
		if (!file) { setMessage('Paste or upload a screenshot before exporting.'); return; }
		if (background.kind === 'image' && !backgroundFile) { setMessage('Choose a background image before exporting.'); return; }
		setBusy(true);
		try {
			const blob = await renderScreenshotBeautification(file, {
				scale, padding, radius, shadow, shadowBlur, shadowOffset, frame, background,
				backgroundImage: background.kind === 'image' ? backgroundFile : undefined,
				format,
			});
			if (preview) setOutputUrl((previous) => {
				if (previous) URL.revokeObjectURL(previous);
				return URL.createObjectURL(blob);
			});
			else downloadImage(blob, `screenshot-beautified-${scale}x.${format === 'image/png' ? 'png' : 'webp'}`);
			setMessage(`${preview ? 'Preview created' : 'Exported'} at ${scale}× · ${formatImageBytes(blob.size)}.`);
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Could not beautify the screenshot.');
		} finally {
			setBusy(false);
		}
	};

	return <div>
		<div className="tool-actions"><button className="tool-button secondary" type="button" onClick={() => void pasteFromClipboard()}>Paste from clipboard</button><label className="tool-button secondary" htmlFor="screenshot-file">Upload screenshot</label><input id="screenshot-file" className="image-file-input" type="file" accept={ACCEPTED} onChange={(event) => { void chooseFile(event.currentTarget.files?.[0]); }} /></div>
		<p className="privacy-note">Paste with Ctrl+V or upload. Your screenshots never leave your device.</p>
		{sourceUrl && <img src={sourceUrl} alt="Screenshot to beautify" style={{ maxWidth: '100%', maxHeight: 300, display: 'block', margin: '14px auto' }} />}
		<div className="calc-fields" style={{ marginTop: 14 }}>
			<div className="calc-field"><label htmlFor="screenshot-background-type">Background</label><select id="screenshot-background-type" value={background.kind} onChange={(event) => setBackground(event.target.value === 'image' ? { kind: 'image' } : event.target.value === 'solid' ? { kind: 'solid', color: '#e5e7eb' } : { kind: 'gradient', start: gradientPresets[0].start, end: gradientPresets[0].end })}><option value="gradient">Gradient</option><option value="solid">Solid colour</option><option value="image">Uploaded image</option></select></div>
			{background.kind === 'gradient' && <div className="calc-field"><label htmlFor="screenshot-preset">Gradient preset</label><select id="screenshot-preset" value={`${background.start}|${background.end}`} onChange={(event) => { const preset = gradientPresets.find((item) => `${item.start}|${item.end}` === event.target.value); if (preset) setBackground({ kind: 'gradient', start: preset.start, end: preset.end }); }}>{gradientPresets.map((preset) => <option key={preset.name} value={`${preset.start}|${preset.end}`}>{preset.name}</option>)}</select></div>}
			{background.kind === 'solid' && <div className="calc-field"><label htmlFor="screenshot-solid">Background colour</label><input id="screenshot-solid" type="color" value={background.color} onChange={(event) => setBackground({ kind: 'solid', color: event.target.value })} /></div>}
			{background.kind === 'image' && <div className="calc-field"><label htmlFor="screenshot-background-image">Background image</label><input id="screenshot-background-image" type="file" accept={ACCEPTED} onChange={(event) => setBackgroundFile(event.currentTarget.files?.[0])} /></div>}
			<div className="calc-field"><label htmlFor="screenshot-padding">Padding: {padding}px</label><input id="screenshot-padding" type="range" min="0" max="200" value={padding} onChange={(event) => setPadding(Number(event.target.value))} /></div>
			<div className="calc-field"><label htmlFor="screenshot-radius">Corner radius: {radius}px</label><input id="screenshot-radius" type="range" min="0" max="100" value={radius} onChange={(event) => setRadius(Number(event.target.value))} /></div>
			<div className="calc-field"><label htmlFor="screenshot-frame">Frame</label><select id="screenshot-frame" value={frame} onChange={(event) => setFrame(event.target.value as ScreenshotFrame)}><option value="none">None</option><option value="browser">Browser window</option><option value="phone">Phone</option></select></div>
			<div className="calc-field"><label htmlFor="screenshot-scale">Export scale</label><select id="screenshot-scale" value={scale} onChange={(event) => setScale(Number(event.target.value) as 1 | 2 | 4)}><option value={1}>1×</option><option value={2}>2×</option><option value={4}>4×</option></select></div>
			<div className="calc-field"><label htmlFor="screenshot-format">Format</label><select id="screenshot-format" value={format} onChange={(event) => setFormat(event.target.value as 'image/png' | 'image/webp')}><option value="image/png">PNG</option><option value="image/webp">WebP</option></select></div>
		</div>
		<div className="tool-control"><label><input type="checkbox" checked={shadow} onChange={(event) => setShadow(event.target.checked)} /> Add shadow</label></div>
		{shadow && <div className="calc-fields"><div className="calc-field"><label htmlFor="screenshot-shadow-blur">Shadow blur: {shadowBlur}px</label><input id="screenshot-shadow-blur" type="range" min="0" max="80" value={shadowBlur} onChange={(event) => setShadowBlur(Number(event.target.value))} /></div><div className="calc-field"><label htmlFor="screenshot-shadow-offset">Shadow offset: {shadowOffset}px</label><input id="screenshot-shadow-offset" type="range" min="0" max="80" value={shadowOffset} onChange={(event) => setShadowOffset(Number(event.target.value))} /></div></div>}
		<div className="tool-actions"><button className="tool-button secondary" type="button" disabled={busy || !file} onClick={() => void exportImage(true)}>Preview</button><button className="tool-button" type="button" disabled={busy || !file} onClick={() => void exportImage(false)}>Export image</button></div>
		{backgroundPreviewUrl && background.kind === 'image' && <p className="inline-note">Background image selected: {backgroundFile?.name}</p>}
		{outputUrl && <img src={outputUrl} alt="Beautified screenshot preview" style={{ width: 'min(100%, 720px)', height: 'auto', display: 'block', margin: '18px auto' }} />}
		{busy && <progress className="tool-progress" max={100} value={0} aria-label="Rendering screenshot" />}
		<p className="tool-status" aria-live="polite">{message}</p>
	</div>;
}
