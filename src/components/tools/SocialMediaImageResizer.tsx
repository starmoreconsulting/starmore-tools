import { useEffect, useMemo, useState } from 'react';
import { zipSync } from 'fflate';
import { socialSizePresets, socialSizesLastChecked, type SocialSizePreset } from '../../data/social-sizes';
import {
	checkImageDimensions,
	decodeImageFile,
	downloadImage,
	estimateImageBytes,
	formatImageBytes,
	runImageWorker,
	type DecodedImage,
	type ImageOutputType,
} from '../../engines/image/toolkit';

type FitMode = 'cover' | 'contain' | 'blurred';

function renderSocial(canvas: HTMLCanvasElement, source: DecodedImage, preset: SocialSizePreset, fit: FitMode, background: string, focus: { x: number; y: number }, type: ImageOutputType): void {
	canvas.width = preset.width;
	canvas.height = preset.height;
	const context = canvas.getContext('2d');
	if (!context) throw new Error('Your browser could not prepare the resized image.');
	context.clearRect(0, 0, canvas.width, canvas.height);
	if (fit === 'cover') {
		const scale = Math.max(canvas.width / source.width, canvas.height / source.height);
		const scaledWidth = source.width * scale;
		const scaledHeight = source.height * scale;
		const cropX = Math.max(0, Math.min(scaledWidth - canvas.width, focus.x * (scaledWidth - canvas.width)));
		const cropY = Math.max(0, Math.min(scaledHeight - canvas.height, focus.y * (scaledHeight - canvas.height)));
		context.drawImage(source.bitmap, -cropX, -cropY, scaledWidth, scaledHeight);
	} else {
		context.fillStyle = type === 'image/png' || type === 'image/webp' ? background : background;
		context.fillRect(0, 0, canvas.width, canvas.height);
		if (fit === 'blurred') {
			const scale = Math.max(canvas.width / source.width, canvas.height / source.height);
			const blur = Math.max(5, Math.min(45, Math.round(Math.min(canvas.width, canvas.height) * 0.035)));
			context.save();
			context.filter = `blur(${blur}px)`;
			context.drawImage(source.bitmap, -blur, -blur, source.width * scale + blur * 2, source.height * scale + blur * 2);
			context.restore();
		}
		const scale = Math.min(canvas.width / source.width, canvas.height / source.height);
		const width = source.width * scale;
		const height = source.height * scale;
		context.drawImage(source.bitmap, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
	}
}

export default function SocialMediaImageResizer() {
	const [file, setFile] = useState<File | null>(null);
	const [source, setSource] = useState<DecodedImage | null>(null);
	const [inputUrl, setInputUrl] = useState('');
	const [presetId, setPresetId] = useState(socialSizePresets[0].id);
	const [selectedIds, setSelectedIds] = useState<string[]>([socialSizePresets[0].id]);
	const [fit, setFit] = useState<FitMode>('cover');
	const [background, setBackground] = useState('#FFFFFF');
	const [focus, setFocus] = useState({ x: 0.5, y: 0.5 });
	const [format, setFormat] = useState<ImageOutputType>('image/png');
	const [quality, setQuality] = useState(90);
	const [previewUrl, setPreviewUrl] = useState('');
	const [output, setOutput] = useState<Blob | null>(null);
	const [outputUrl, setOutputUrl] = useState('');
	const [busy, setBusy] = useState(false);
	const [compare, setCompare] = useState(50);
	const [message, setMessage] = useState('Choose an image and a social media size. All processing is local.');
	const preset = useMemo(() => socialSizePresets.find((item) => item.id === presetId) ?? socialSizePresets[0], [presetId]);

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
	useEffect(() => {
		if (!source) { setPreviewUrl(''); return; }
		const canvas = document.createElement('canvas');
		const scale = Math.min(1, 960 / Math.max(preset.width, preset.height));
		const previewPreset = { ...preset, width: Math.max(1, Math.round(preset.width * scale)), height: Math.max(1, Math.round(preset.height * scale)) };
		try {
			renderSocial(canvas, source, previewPreset, fit, background, focus, format);
			canvas.toBlob((blob) => {
				if (!blob) { setMessage('Your browser could not prepare the preview.'); return; }
				const url = URL.createObjectURL(blob);
				setPreviewUrl((previous) => {
					if (previous) URL.revokeObjectURL(previous);
					return url;
				});
				canvas.width = 0;
				canvas.height = 0;
			}, 'image/png');
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Could not prepare the resized preview.');
		}
		return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
	}, [source, preset, fit, background, focus, format]);

	const chooseFile = async (selected?: File) => {
		setSource(null);
		setFile(null);
		setOutput(null);
		if (!selected) return;
		try {
			const decoded = await decodeImageFile(selected);
			setSource(decoded);
			setFile(selected);
			setMessage(`${decoded.width.toLocaleString()} × ${decoded.height.toLocaleString()} px image ready.`);
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Could not open this image. Convert it to JPG or PNG first.');
		}
	};

	const focusFromPointer = (event: React.PointerEvent<HTMLDivElement>) => {
		if (fit !== 'cover') return;
		const bounds = event.currentTarget.getBoundingClientRect();
		setFocus({
			x: Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)),
			y: Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height)),
		});
	};

	const makeOutput = async (selectedPresets: SocialSizePreset[]) => {
		if (!source || !file) { setMessage('Choose an image before resizing.'); return; }
		setBusy(true);
		setOutput(null);
		setMessage(selectedPresets.length > 1 ? `Creating ${selectedPresets.length} local image sizes…` : 'Creating a local resized image…');
		try {
			const archive: Record<string, Uint8Array> = {};
			let single: Blob | null = null;
			for (const item of selectedPresets) {
				checkImageDimensions(item.width, item.height);
				const sourceCopy = await decodeImageFile(file);
				const result = await runImageWorker({
					type: 'social-resize',
					source: sourceCopy.bitmap,
					width: item.width,
					height: item.height,
					fit,
					background,
					focus,
					outputType: format,
					quality,
				});
				const blob = result.blob;
				if (!blob) throw new Error('The resize worker returned no image.');
				if (selectedPresets.length === 1) single = blob;
				else archive[`${item.platform.toLowerCase()}-${item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.${format === 'image/jpeg' ? 'jpg' : format.slice(6)}`] = new Uint8Array(await blob.arrayBuffer());
			}
			if (single) {
				setOutput(single);
				setMessage(`Resized to ${preset.width.toLocaleString()} × ${preset.height.toLocaleString()} px. Estimated size ${formatImageBytes(estimateImageBytes(preset.width, preset.height, format, quality / 100))}; actual size ${formatImageBytes(single.size)}.`);
			} else {
				const zipped = zipSync(archive, { level: 5 });
				const blob = new Blob([zipped], { type: 'application/zip' });
				downloadImage(blob, 'starmore-social-images.zip');
				setMessage(`Created and downloaded ${selectedPresets.length} sizes in a ${formatImageBytes(blob.size)} ZIP.`);
			}
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Could not resize the selected image.');
		} finally {
			setBusy(false);
		}
	};

	const toggleSelected = (id: string) => {
		setSelectedIds((previous) => previous.includes(id) ? previous.filter((item) => item !== id) : [...previous, id]);
	};

	return (
		<div>
			<div className="tool-control">
				<label htmlFor="social-resizer-file">Choose image</label>
				<input className="image-file-input" id="social-resizer-file" type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/bmp,.jpg,.jpeg,.png,.webp,.gif,.bmp,.heic,.heif" onChange={(event) => { void chooseFile(event.currentTarget.files?.[0]); }} />
			</div>
			<p className="inline-note">Preset list last checked: {socialSizesLastChecked}</p>
			{source && <p className="inline-note">Source: {source.width.toLocaleString()} × {source.height.toLocaleString()} px · {file ? formatImageBytes(file.size) : ''}</p>}
			<div className="calc-fields" style={{ marginTop: 14 }}>
				<div className="calc-field">
					<label htmlFor="social-resizer-preset">Social size</label>
					<select id="social-resizer-preset" value={presetId} onChange={(event) => setPresetId(event.target.value)}>
						{socialSizePresets.map((item) => <option key={item.id} value={item.id}>{item.platform} — {item.name} ({item.width} × {item.height})</option>)}
					</select>
				</div>
				<div className="calc-field">
					<label htmlFor="social-resizer-fit">Fit mode</label>
					<select id="social-resizer-fit" value={fit} onChange={(event) => setFit(event.target.value as FitMode)}>
						<option value="cover">Cover (crop)</option><option value="contain">Contain with solid colour</option><option value="blurred">Contain with blurred background</option>
					</select>
				</div>
				{fit === 'contain' && <div className="calc-field">
					<label htmlFor="social-resizer-background">Background colour</label>
					<input id="social-resizer-background" type="color" value={background} onChange={(event) => setBackground(event.target.value)} />
				</div>}
				<div className="calc-field">
					<label htmlFor="social-resizer-format">Format</label>
					<select id="social-resizer-format" value={format} onChange={(event) => setFormat(event.target.value as ImageOutputType)}>
						<option value="image/png">PNG</option><option value="image/jpeg">JPG</option><option value="image/webp">WebP</option>
					</select>
				</div>
			</div>
			{format !== 'image/png' && <div className="tool-control" style={{ marginTop: 14 }}>
				<label htmlFor="social-resizer-quality">Quality: {quality}%</label>
				<input id="social-resizer-quality" type="range" min="10" max="100" value={quality} onChange={(event) => setQuality(Number(event.target.value))} />
			</div>}
			<p className="inline-note">Final size: {preset.width.toLocaleString()} × {preset.height.toLocaleString()} px · estimated file size {formatImageBytes(estimateImageBytes(preset.width, preset.height, format, quality / 100))}</p>
			{previewUrl && <div className="tool-preview" style={{ display: 'block' }}>
				<div onPointerDown={(event) => { if (fit === 'cover') event.currentTarget.setPointerCapture(event.pointerId); focusFromPointer(event); }} onPointerMove={(event) => { if (event.buttons > 0) focusFromPointer(event); }} style={{ position: 'relative', width: `min(100%, ${360 * preset.width / preset.height}px)`, aspectRatio: `${preset.width} / ${preset.height}`, maxHeight: 360, margin: '0 auto', overflow: 'hidden', touchAction: fit === 'cover' ? 'none' : 'auto', cursor: fit === 'cover' ? 'crosshair' : 'default', background: 'repeating-conic-gradient(#eee 0% 25%, #fff 0% 50%) 50% / 16px 16px' }}>
					<img src={previewUrl} alt={`${preset.platform} ${preset.name} resized preview`} style={{ width: '100%', height: '100%', maxWidth: 'none', maxHeight: 'none', objectFit: 'contain' }} />
					{fit === 'cover' && <span aria-hidden="true" style={{ position: 'absolute', left: `${focus.x * 100}%`, top: `${focus.y * 100}%`, width: 18, height: 18, border: '2px solid white', borderRadius: '50%', boxShadow: '0 0 0 1px #222', transform: 'translate(-50%, -50%)', pointerEvents: 'none' }} />}
				</div>
			</div>}
			<div className="tool-actions">
				<button className="tool-button" type="button" disabled={!source || busy} onClick={() => void makeOutput([preset])}>Download this size</button>
				<button className="tool-button secondary" type="button" disabled={!output || busy} onClick={() => output && downloadImage(output, `${preset.id}.${format === 'image/jpeg' ? 'jpg' : format.slice(6)}`)}>Save resized image</button>
			</div>
			{outputUrl && inputUrl && <div className="tool-preview" style={{ display: 'block' }}>
				<div style={{ position: 'relative', width: '100%', height: 'min(60vw, 360px)', minHeight: 160, overflow: 'hidden' }}>
					<img src={outputUrl} alt="Resized image result" style={{ width: '100%', height: '100%', maxWidth: 'none', maxHeight: 'none', objectFit: 'contain' }} />
					<div style={{ position: 'absolute', inset: 0, overflow: 'hidden', clipPath: `inset(0 ${100 - compare}% 0 0)` }}><img src={inputUrl} alt="Original image comparison" style={{ width: '100%', height: '100%', maxWidth: 'none', maxHeight: 'none', objectFit: 'contain' }} /></div>
				</div>
				<label style={{ display: 'block', marginTop: 10 }}><span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>Compare original image</span><input style={{ width: '100%' }} type="range" min="0" max="100" value={compare} onChange={(event) => setCompare(Number(event.target.value))} /></label>
			</div>}
			<div style={{ marginTop: 18 }}>
				<h3>Download multiple sizes as a ZIP</h3>
				{socialSizePresets.map((item) => <label key={item.id} className="tool-choice" style={{ display: 'flex', marginTop: 8 }}>
					<input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggleSelected(item.id)} />
					<span>{item.platform} — {item.name} ({item.width} × {item.height})</span>
				</label>)}
				<button className="tool-button secondary" type="button" disabled={!source || !selectedIds.length || busy} onClick={() => void makeOutput(socialSizePresets.filter((item) => selectedIds.includes(item.id)))}>Download selected as ZIP</button>
			</div>
			<p className="tool-message" role="status">{message}</p>
			<p className="privacy-note">Your image files never leave your device. Cover mode crops around a draggable focus point; contain modes preserve the full image.</p>
		</div>
	);
}
