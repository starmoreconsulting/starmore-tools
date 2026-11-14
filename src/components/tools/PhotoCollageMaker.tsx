import { useEffect, useRef, useState, type DragEvent, type PointerEvent } from 'react';
import { collageLayouts, type CollageLayout } from '../../data/collage-layouts';
import { coverSourceCrop, type NormalizedPoint } from '../../engines/image/composition-math';
import { calculateCollageCells, renderCollage, type CollageBackground, type CollageOptions } from '../../engines/image/collage-engine';
import { decodeImageFile, downloadImage, formatImageBytes, type DecodedImage } from '../../engines/image/toolkit';

type AspectPreset = 'square' | '4:5' | '9:16' | '16:9' | 'custom';
type CropState = { zoom: number; center: NormalizedPoint };
const MAX_FILES = 9;
const ACCEPTED = 'image/jpeg,image/png,image/webp,image/gif,image/bmp,.jpg,.jpeg,.png,.webp,.gif,.bmp,.heic,.heif';

function aspectRatio(preset: AspectPreset, width: number, height: number): number {
	if (preset === '4:5') return 4 / 5;
	if (preset === '9:16') return 9 / 16;
	if (preset === '16:9') return 16 / 9;
	if (preset === 'custom') return width / height;
	return 1;
}

export default function PhotoCollageMaker() {
	const [files, setFiles] = useState<File[]>([]);
	const [previews, setPreviews] = useState<DecodedImage[]>([]);
	const [previewUrls, setPreviewUrls] = useState<string[]>([]);
	const [assignments, setAssignments] = useState<number[]>([]);
	const [cropStates, setCropStates] = useState<CropState[]>([]);
	const [selectedPhoto, setSelectedPhoto] = useState(0);
	const [layoutId, setLayoutId] = useState('');
	const [aspect, setAspect] = useState<AspectPreset>('square');
	const [customWidth, setCustomWidth] = useState(1200);
	const [customHeight, setCustomHeight] = useState(1500);
	const [longestSide, setLongestSide] = useState(2048);
	const [spacing, setSpacing] = useState(24);
	const [padding, setPadding] = useState(24);
	const [radius, setRadius] = useState(0);
	const [background, setBackground] = useState<CollageBackground>({ kind: 'solid', color: '#ffffff' });
	const [format, setFormat] = useState<'image/png' | 'image/jpeg'>('image/png');
	const [outputUrl, setOutputUrl] = useState('');
	const [busy, setBusy] = useState(false);
	const [message, setMessage] = useState('Choose 2 to 9 photos. Your images stay on your device.');
	const dragRef = useRef<{ pointer: number; start: { x: number; y: number }; center: NormalizedPoint } | null>(null);

	const availableLayouts = collageLayouts.filter((item) => item.photoCount === files.length);
	const layout = availableLayouts.find((item) => item.id === layoutId) ?? availableLayouts[0];
	const ratio = aspectRatio(aspect, customWidth, customHeight);
	const outputWidth = ratio >= 1 ? longestSide : Math.max(1, Math.round(longestSide * ratio));
	const outputHeight = ratio < 1 ? longestSide : Math.max(1, Math.round(longestSide / ratio));
	const selectedCrop = cropStates[selectedPhoto] ?? { zoom: 1, center: { x: 0.5, y: 0.5 } };
	const previewScale = Math.min(1, 1024 / outputWidth, 1024 / outputHeight);
	const previewWidth = Math.max(1, Math.round(outputWidth * previewScale));
	const previewHeight = Math.max(1, Math.round(outputHeight * previewScale));
	const activeCellIndex = assignments.indexOf(selectedPhoto);
	const widestRow = layout ? Math.max(...layout.rows) : 0;
	const activeCell = layout
		&& outputWidth - padding * 2 - spacing * (widestRow - 1) > 0
		&& outputHeight - padding * 2 - spacing * (layout.rows.length - 1) > 0
		? calculateCollageCells(outputWidth, outputHeight, layout, spacing, padding)[activeCellIndex]
		: null;
	const activeCellAspect = activeCell ? activeCell.width / activeCell.height : 1;

	useEffect(() => () => previews.forEach((item) => item.bitmap.close()), [previews]);
	useEffect(() => {
		const urls = files.map((file) => URL.createObjectURL(file));
		setPreviewUrls(urls);
		return () => urls.forEach((url) => URL.revokeObjectURL(url));
	}, [files]);
	useEffect(() => {
		if (!outputUrl) return;
		return () => URL.revokeObjectURL(outputUrl);
	}, [outputUrl]);

	const chooseFiles = async (selected: FileList | null) => {
		const chosen = selected ? Array.from(selected).slice(0, MAX_FILES) : [];
		const omitted = Math.max(0, (selected?.length ?? 0) - MAX_FILES);
		if (chosen.length < 2) {
			setMessage('Choose at least two photos to make a collage.');
			return;
		}
		const decoded: DecodedImage[] = [];
		try {
			for (const file of chosen) decoded.push(await decodeImageFile(file));
			setPreviews(decoded);
			setFiles(chosen);
			setAssignments(chosen.map((_, index) => index));
			setCropStates(chosen.map(() => ({ zoom: 1, center: { x: 0.5, y: 0.5 } })));
			setSelectedPhoto(0);
			setLayoutId('');
			setOutputUrl('');
			setMessage(`${chosen.length} photos ready${omitted ? ` · only the first ${MAX_FILES} were loaded` : ''}. Drag inside the active photo to adjust its crop.`);
		} catch (error) {
			decoded.forEach((item) => item.bitmap.close());
			setMessage(error instanceof Error ? error.message : 'One of the selected photos could not be opened.');
		}
	};

	const onDragStart = (event: DragEvent<HTMLButtonElement>, cell: number) => event.dataTransfer.setData('text/plain', String(cell));
	const onDrop = (event: DragEvent<HTMLButtonElement>, target: number) => {
		event.preventDefault();
		const source = Number(event.dataTransfer.getData('text/plain'));
		if (!Number.isInteger(source) || source < 0 || source >= assignments.length || source === target) return;
		setAssignments((current) => {
			const next = [...current];
			[next[source], next[target]] = [next[target], next[source]];
			return next;
		});
	};

	const updateCrop = (next: CropState) => setCropStates((current) => current.map((crop, index) => index === selectedPhoto ? next : crop));
	const pointerDown = (event: PointerEvent<HTMLDivElement>) => {
		event.currentTarget.setPointerCapture(event.pointerId);
		dragRef.current = { pointer: event.pointerId, start: { x: event.clientX, y: event.clientY }, center: selectedCrop.center };
	};
	const pointerMove = (event: PointerEvent<HTMLDivElement>) => {
		const drag = dragRef.current;
		const source = previews[selectedPhoto];
		if (!drag || !source) return;
		const bounds = event.currentTarget.getBoundingClientRect();
		updateCrop({
			...selectedCrop,
			center: {
				x: Math.max(0, Math.min(1, drag.center.x - (event.clientX - drag.start.x) / bounds.width)),
				y: Math.max(0, Math.min(1, drag.center.y - (event.clientY - drag.start.y) / bounds.height)),
			},
		});
	};

	const makeCollage = async (preview = false) => {
		if (!layout || files.length < 2) { setMessage('Choose 2 to 9 photos before creating a collage.'); return; }
		setBusy(true);
		try {
			const scale = preview ? previewScale : 1;
			const options: CollageOptions = {
				width: preview ? previewWidth : outputWidth,
				height: preview ? previewHeight : outputHeight,
				spacing: Math.round(spacing * scale),
				padding: Math.round(padding * scale),
				radius: Math.round(radius * scale),
				background,
				assignments,
				zoom: cropStates.map((crop) => crop.zoom),
				center: cropStates.map((crop) => crop.center),
			};
			const blob = await renderCollage(files, layout, options, format);
			if (preview) setOutputUrl((previous) => {
				if (previous) URL.revokeObjectURL(previous);
				return URL.createObjectURL(blob);
			});
			else downloadImage(blob, `photo-collage-${options.width}x${options.height}.${format === 'image/png' ? 'png' : 'jpg'}`);
			setMessage(`${preview ? 'Preview created' : 'Collage exported'} · ${options.width} × ${options.height} px · ${formatImageBytes(blob.size)}.`);
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Could not create the collage.');
		} finally {
			setBusy(false);
		}
	};

	const activeImage = previews[selectedPhoto];
	const activeCrop = activeImage ? coverSourceCrop(activeImage.width, activeImage.height, activeCellAspect, selectedCrop.zoom, selectedCrop.center) : null;

	return <div>
		<div className="tool-control"><label htmlFor="collage-files">Choose 2 to 9 photos</label><input id="collage-files" className="image-file-input" type="file" accept={ACCEPTED} multiple onChange={(event) => { void chooseFiles(event.currentTarget.files); }} /></div>
		<p className="privacy-note">Your photos never leave your device. Large exports may take longer on older devices.</p>
		{files.length > 0 && <div>
			<div className="calc-fields" style={{ marginTop: 14 }}>
				<div className="calc-field"><label htmlFor="collage-layout">Layout · {files.length} photos</label><select id="collage-layout" value={layout?.id ?? ''} onChange={(event) => setLayoutId(event.target.value)}>{availableLayouts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
				<div className="calc-field"><label htmlFor="collage-aspect">Aspect ratio</label><select id="collage-aspect" value={aspect} onChange={(event) => setAspect(event.target.value as AspectPreset)}><option value="square">Square</option><option value="4:5">4:5</option><option value="9:16">9:16</option><option value="16:9">16:9</option><option value="custom">Custom</option></select></div>
				{aspect === 'custom' && <><div className="calc-field"><label htmlFor="collage-width">Custom width ratio</label><input id="collage-width" type="number" min="1" max="10000" value={customWidth} onChange={(event) => setCustomWidth(Math.max(1, Number(event.target.value)))} /></div><div className="calc-field"><label htmlFor="collage-height">Custom height ratio</label><input id="collage-height" type="number" min="1" max="10000" value={customHeight} onChange={(event) => setCustomHeight(Math.max(1, Number(event.target.value)))} /></div></>}
				<div className="calc-field"><label htmlFor="collage-size">Longest side · {longestSide}px</label><select id="collage-size" value={longestSide} onChange={(event) => setLongestSide(Number(event.target.value))}><option value={1024}>1024 px</option><option value={2048}>2048 px</option><option value={3072}>3072 px</option><option value={4096}>4096 px</option></select></div>
				<div className="calc-field"><label htmlFor="collage-spacing">Spacing · {spacing}px</label><input id="collage-spacing" type="range" min="0" max="160" value={spacing} onChange={(event) => setSpacing(Number(event.target.value))} /></div>
				<div className="calc-field"><label htmlFor="collage-padding">Outer padding · {padding}px</label><input id="collage-padding" type="range" min="0" max="160" value={padding} onChange={(event) => setPadding(Number(event.target.value))} /></div>
				<div className="calc-field"><label htmlFor="collage-radius">Corner radius · {radius}px</label><input id="collage-radius" type="range" min="0" max="120" value={radius} onChange={(event) => setRadius(Number(event.target.value))} /></div>
				<div className="calc-field"><label htmlFor="collage-format">Format</label><select id="collage-format" value={format} onChange={(event) => setFormat(event.target.value as 'image/png' | 'image/jpeg')}><option value="image/png">PNG</option><option value="image/jpeg">JPG</option></select></div>
				<div className="calc-field"><label htmlFor="collage-background-kind">Background</label><select id="collage-background-kind" value={background.kind} onChange={(event) => setBackground(event.target.value === 'gradient' ? { kind: 'gradient', start: '#dce8f4', end: '#f5e8df' } : { kind: 'solid', color: '#ffffff' })}><option value="solid">Solid colour</option><option value="gradient">Gradient</option></select></div>
				{background.kind === 'solid' ? <div className="calc-field"><label htmlFor="collage-background">Background colour</label><input id="collage-background" type="color" value={background.color} onChange={(event) => setBackground({ kind: 'solid', color: event.target.value })} /></div> : <><div className="calc-field"><label htmlFor="collage-gradient-start">Gradient start</label><input id="collage-gradient-start" type="color" value={background.start} onChange={(event) => setBackground((current) => ({ kind: 'gradient', start: event.target.value, end: current.kind === 'gradient' ? current.end : '#f5e8df' }))} /></div><div className="calc-field"><label htmlFor="collage-gradient-end">Gradient end</label><input id="collage-gradient-end" type="color" value={background.end} onChange={(event) => setBackground((current) => ({ kind: 'gradient', start: current.kind === 'gradient' ? current.start : '#dce8f4', end: event.target.value }))} /></div></>}
			</div>
			<div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>{assignments.map((sourceIndex, cell) => <button key={cell} type="button" className="tool-button secondary" draggable onDragStart={(event) => onDragStart(event, cell)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => onDrop(event, cell)} onClick={() => setSelectedPhoto(sourceIndex)} aria-label={`Cell ${cell + 1}, photo ${sourceIndex + 1}. Drag to swap photos.`} style={{ width: 86, padding: 5, outline: selectedPhoto === sourceIndex ? '2px solid currentColor' : undefined }}><img src={previewUrls[sourceIndex]} alt={`Photo ${sourceIndex + 1}`} width={72} height={72} style={{ objectFit: 'cover', borderRadius: 4 }} /><span style={{ display: 'block' }}>Cell {cell + 1} · Photo {sourceIndex + 1}</span></button>)}</div>
			{activeImage && activeCell && activeCrop && <div style={{ marginTop: 16, maxWidth: 360 }}><p className="inline-note">Adjust photo {selectedPhoto + 1}: drag to pan, then zoom</p><div onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); dragRef.current = { pointer: event.pointerId, start: { x: event.clientX, y: event.clientY }, center: selectedCrop.center }; }} onPointerMove={pointerMove} onPointerUp={() => { dragRef.current = null; }} onPointerCancel={() => { dragRef.current = null; }} style={{ aspectRatio: String(activeCellAspect), overflow: 'hidden', touchAction: 'none', cursor: 'grab', maxHeight: 240, position: 'relative' }}><img src={previewUrls[selectedPhoto]} alt={`Adjust crop for photo ${selectedPhoto + 1}`} draggable={false} style={{ position: 'absolute', width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${selectedCrop.center.x * 100}% ${selectedCrop.center.y * 100}%`, transform: `scale(${selectedCrop.zoom})`, userSelect: 'none' }} /></div><label htmlFor="collage-zoom">Zoom: {selectedCrop.zoom.toFixed(2)}×</label><input id="collage-zoom" type="range" min="1" max="4" step="0.01" value={selectedCrop.zoom} onChange={(event) => updateCrop({ ...selectedCrop, zoom: Number(event.target.value) })} /></div>}
			<div className="tool-actions"><button className="tool-button secondary" type="button" disabled={busy} onClick={() => void makeCollage(true)}>Preview collage</button><button className="tool-button" type="button" disabled={busy} onClick={() => void makeCollage(false)}>Export collage</button></div>
		</div>}
		{outputUrl && <img src={outputUrl} alt="Photo collage preview" style={{ width: 'min(100%, 520px)', height: 'auto', display: 'block', margin: '18px auto', borderRadius: 4 }} />}
		{busy && <progress className="tool-progress" max={100} value={0} aria-label="Processing collage" />}
		<p className="tool-status" aria-live="polite">{message}</p>
	</div>;
}
