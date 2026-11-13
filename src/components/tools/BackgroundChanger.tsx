import { useEffect, useRef, useState, type PointerEvent } from 'react';
import {
	exportBackgroundImage,
	rebuildBackgroundMask,
	refineBackgroundMask,
	type BackgroundFill,
	type BrushMode,
	type BrushStroke,
} from '../../engines/image/background-engine';
import {
	decodeImageFile,
	downloadImage,
	estimateImageBytes,
	formatImageBytes,
	getImageLimits,
	checkImageDimensions,
	type DecodedImage,
	type ImageOutputType,
} from '../../engines/image/toolkit';
import { initializeModelRuntime } from '../../engines/image/models/model-runtime';
import { loadBackgroundModel } from '../../engines/image/models/model-loader';
import type { BackgroundModelName, ModelManifest } from '../../engines/image/models/model-loader';

type FillKind = 'solid' | 'gradient' | 'blurred' | 'image' | 'transparent';
type SizePreset = 'original' | 'square' | 'portrait' | 'widescreen' | 'custom';
type PreviewAction = 'brush' | 'move-background';
type BrushPoint = { x: number; y: number };

const ACCEPTED = 'image/jpeg,image/png,image/webp,image/gif,image/bmp,.jpg,.jpeg,.png,.webp,.gif,.bmp,.heic,.heif';
const COLOUR_SWATCHES = ['#ffffff', '#f2e7d5', '#dce9ef', '#27364a', '#252525', '#dd8c6b', '#a8c686'];

export default function BackgroundChanger() {
	const [file, setFile] = useState<File | null>(null);
	const [source, setSource] = useState<DecodedImage | null>(null);
	const [inputUrl, setInputUrl] = useState('');
	const [previewUrl, setPreviewUrl] = useState('');
	const [backgroundFile, setBackgroundFile] = useState<File | null>(null);
	const [baseMask, setBaseMask] = useState<Uint8Array | null>(null);
	const [mask, setMask] = useState<Uint8Array | null>(null);
	const [maskSize, setMaskSize] = useState({ width: 0, height: 0 });
	const [busy, setBusy] = useState(false);
	const [progress, setProgress] = useState<number | null>(0);
	const [message, setMessage] = useState('Choose a photo. Processing stays entirely on your device.');
	const [elapsed, setElapsed] = useState<number | null>(null);
	const [model, setModel] = useState<BackgroundModelName>('u2netp');
	const [qualityFailed, setQualityFailed] = useState(false);
	const [consentBytes, setConsentBytes] = useState<number | null>(null);
	const [fillKind, setFillKind] = useState<FillKind>('solid');
	const [solidColour, setSolidColour] = useState('#e7ede3');
	const [gradientStart, setGradientStart] = useState('#dce9ef');
	const [gradientEnd, setGradientEnd] = useState('#f0d7c8');
	const [blur, setBlur] = useState(20);
	const [focus, setFocus] = useState({ x: 0.5, y: 0.5 });
	const [shadow, setShadow] = useState(false);
	const [preset, setPreset] = useState<SizePreset>('original');
	const [customWidth, setCustomWidth] = useState(1080);
	const [customHeight, setCustomHeight] = useState(1080);
	const [format, setFormat] = useState<ImageOutputType>('image/png');
	const [quality, setQuality] = useState(90);
	const [jpgColour, setJpgColour] = useState('#ffffff');
	const [compare, setCompare] = useState(50);
	const [brushMode, setBrushMode] = useState<BrushMode>('erase');
	const [brushSize, setBrushSize] = useState(64);
	const [softness, setSoftness] = useState(35);
	const [hardness, setHardness] = useState(50);
	const [feather, setFeather] = useState(0);
	const [edgeShift, setEdgeShift] = useState(0);
	const [historyPosition, setHistoryPosition] = useState({ index: 0, length: 0 });
	const [exporting, setExporting] = useState(false);
	const [previewSurface, setPreviewSurface] = useState<'checkerboard' | 'light' | 'dark'>('checkerboard');
	const [previewAction, setPreviewAction] = useState<PreviewAction>('brush');
	const controllerRef = useRef<AbortController | null>(null);
	const consentResolverRef = useRef<((accepted: boolean) => void) | null>(null);
	const consentAcceptedRef = useRef(false);
	const baselineRef = useRef<Uint8Array | null>(null);
	const strokesRef = useRef<BrushStroke[]>([]);
	const historyIndexRef = useRef(0);
	const activeStrokeRef = useRef<BrushStroke | null>(null);
	const editVersionRef = useRef(0);
	const limits = getImageLimits();
	const lowMemory = limits.maxPixels < 48_000_000;

	useEffect(() => () => source?.bitmap.close(), [source]);
	useEffect(() => {
		if (!file) {
			setInputUrl('');
			return;
		}
		const url = URL.createObjectURL(file);
		setInputUrl(url);
		return () => URL.revokeObjectURL(url);
	}, [file]);
	const outputSize = (): { width: number; height: number } | null => {
		if (!source) return null;
		if (preset === 'original') return { width: source.width, height: source.height };
		if (preset === 'custom') return { width: Math.round(customWidth), height: Math.round(customHeight) };
		const ratio = preset === 'square' ? 1 : preset === 'portrait' ? 4 / 5 : 16 / 9;
		const ratioWidth = ratio >= 1 ? ratio : 1;
		const ratioHeight = ratio >= 1 ? 1 : 1 / ratio;
		const scale = Math.min(
			Math.max(source.width, source.height) / Math.max(ratioWidth, ratioHeight),
			limits.maxSide / Math.max(ratioWidth, ratioHeight),
			Math.sqrt(limits.maxPixels / (ratioWidth * ratioHeight)),
		);
		const width = Math.max(1, Math.floor(ratioWidth * scale));
		const height = Math.max(1, Math.floor(ratioHeight * scale));
		return { width, height };
	};

	const makeFill = async (): Promise<BackgroundFill> => {
		if (fillKind === 'solid') return { kind: 'solid', color: solidColour };
		if (fillKind === 'gradient') return { kind: 'gradient', startColor: gradientStart, endColor: gradientEnd };
		if (fillKind === 'blurred') return { kind: 'blurred', blur };
		if (fillKind === 'transparent') return { kind: 'transparent' };
		if (!backgroundFile) throw new Error('Choose a background image first.');
		return {
			kind: 'image',
			bytes: await backgroundFile.arrayBuffer(),
			type: backgroundFile.type || 'image/jpeg',
			focusX: focus.x,
			focusY: focus.y,
		};
	};

	useEffect(() => {
		if (!file || !source || !mask || !maskSize.width || !maskSize.height || (fillKind === 'image' && !backgroundFile)) {
			setPreviewUrl('');
			return;
		}
		let cancelled = false;
		let objectUrl = '';
		const timer = window.setTimeout(() => {
			void (async () => {
				try {
					const size = outputSize();
					if (!size) return;
					const scale = Math.min(1, 1000 / Math.max(size.width, size.height));
					const fill = await makeFill();
					const blob = await exportBackgroundImage(file, mask, maskSize.width, maskSize.height, {
						format: 'image/png',
						quality: 1,
						backgroundColor: jpgColour,
						fill,
						outputWidth: Math.max(1, Math.round(size.width * scale)),
						outputHeight: Math.max(1, Math.round(size.height * scale)),
						shadow,
					});
					if (cancelled) return;
					objectUrl = URL.createObjectURL(blob);
					setPreviewUrl(objectUrl);
				} catch (error) {
					if (!cancelled) setMessage(error instanceof Error ? error.message : 'The preview could not be rendered.');
				}
			})();
		}, 150);
		return () => {
			cancelled = true;
			window.clearTimeout(timer);
			if (objectUrl) URL.revokeObjectURL(objectUrl);
		};
	}, [file, source, mask, maskSize, fillKind, solidColour, gradientStart, gradientEnd, blur, backgroundFile, focus, shadow, preset, customWidth, customHeight, jpgColour]);

	useEffect(() => {
		if (!baseMask || !maskSize.width || !maskSize.height) {
			setMask(null);
			return;
		}
		let cancelled = false;
		const version = ++editVersionRef.current;
		const timer = window.setTimeout(() => {
			const scale = Math.max(source ? source.width / maskSize.width : 1, source ? source.height / maskSize.height : 1);
			void refineBackgroundMask(baseMask, maskSize.width, maskSize.height, { hardness, feather, edgeShift }, scale)
				.then((refined) => {
					if (!cancelled && version === editVersionRef.current) setMask(refined);
				})
				.catch((error: unknown) => {
					if (!cancelled) setMessage(error instanceof Error ? error.message : 'The mask could not be refined.');
				});
		}, 80);
		return () => {
			cancelled = true;
			window.clearTimeout(timer);
		};
	}, [baseMask, maskSize, hardness, feather, edgeShift, source]);

	const choosePhoto = async (selected?: File) => {
		controllerRef.current?.abort();
		setSource(null);
		setFile(null);
		setMask(null);
		setBaseMask(null);
		setPreviewUrl('');
		setElapsed(null);
		setQualityFailed(false);
		baselineRef.current = null;
		strokesRef.current = [];
		historyIndexRef.current = 0;
		setHistoryPosition({ index: 0, length: 0 });
		if (!selected) return;
		try {
			const decoded = await decodeImageFile(selected);
			setSource(decoded);
			setFile(selected);
			setMessage(`${decoded.width.toLocaleString()} × ${decoded.height.toLocaleString()} px. Remove the background to start editing.`);
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'This image could not be opened. Convert it to JPG or PNG first.');
		}
	};

	const chooseBackground = (selected?: File) => {
		setBackgroundFile(selected ?? null);
		setFocus({ x: 0.5, y: 0.5 });
		if (selected) {
			setFillKind('image');
			setMessage('Background image ready. Choose Move background image in the preview to reposition it.');
		}
	};

	const runModel = async (selectedModel: BackgroundModelName) => {
		if (!file) return;
		controllerRef.current?.abort();
		const controller = new AbortController();
		controllerRef.current = controller;
		setBusy(true);
		setProgress(0);
		setElapsed(null);
		setQualityFailed(false);
		setMessage(selectedModel === 'isnet' ? 'Loading the high-quality model…' : 'Loading the Quick model…');
		try {
			const loaded = await loadBackgroundModel(selectedModel, {
				signal: controller.signal,
				onProgress: (update) => {
					setProgress(10 + update.percent * 0.65);
					setMessage(`Downloading ${selectedModel === 'isnet' ? 'High quality' : 'Quick'} model: ${formatImageBytes(update.completedBytes)} of ${formatImageBytes(update.totalBytes)} (${update.percent.toFixed(1)}%).`);
				},
				requestConsent: async () => consentAcceptedRef.current,
			});
			if (controller.signal.aborted) return;
			setProgress(80);
			setMessage('Starting the model in a background worker…');
			const runtime = await initializeModelRuntime(selectedModel, loaded, controller.signal);
			try {
				setProgress(null);
				setMessage(`Removing the background with ${selectedModel === 'isnet' ? 'High quality' : 'Quick mode'}…`);
				const started = performance.now();
				const result = await runtime.removeBackground(file);
				const seconds = (performance.now() - started) / 1000;
				if (controller.signal.aborted) return;
				baselineRef.current = result.mask.slice();
				strokesRef.current = [];
				historyIndexRef.current = 0;
				setHistoryPosition({ index: 0, length: 0 });
				setMaskSize({ width: result.maskWidth, height: result.maskHeight });
				setBaseMask(result.mask);
				setModel(selectedModel);
				setElapsed(seconds);
				setProgress(100);
				setMessage(`Processed in ${seconds.toFixed(2)} s with ${selectedModel === 'isnet' ? 'High quality' : 'Quick mode'}.`);
			} finally {
				runtime.terminate();
			}
		} catch (error) {
			if (controller.signal.aborted || (error instanceof Error && error.name === 'AbortError')) {
				setMessage('Processing cancelled. Your original image is unchanged.');
			} else {
				setMessage(error instanceof Error ? error.message : 'Background removal could not complete.');
				if (selectedModel === 'isnet') setQualityFailed(true);
			}
		} finally {
			if (controllerRef.current === controller) controllerRef.current = null;
			setBusy(false);
		}
	};

	const requestHighQuality = async () => {
		try {
			const response = await fetch('/models/isnet/manifest.json', { credentials: 'same-origin', cache: 'no-cache' });
			if (!response.ok) throw new Error(`The High quality model size could not be checked (HTTP ${response.status}).`);
			const manifest = await response.json() as ModelManifest;
			if (!Number.isSafeInteger(manifest.totalBytes) || manifest.totalBytes <= 0) throw new Error('The High quality model manifest contains an invalid download size.');
			if (!consentAcceptedRef.current) {
				setConsentBytes(manifest.totalBytes);
				const accepted = await new Promise<boolean>((resolve) => {
					consentResolverRef.current = resolve;
				});
				consentResolverRef.current = null;
				setConsentBytes(null);
				if (!accepted) {
					setMessage('High quality was not downloaded. Your current cutout is unchanged.');
					return;
				}
				consentAcceptedRef.current = true;
			}
			await runModel('isnet');
		} catch (error) {
			setConsentBytes(null);
			setMessage(error instanceof Error ? error.message : 'High quality could not be started.');
		}
	};

	const commitBrush = async (stroke: BrushStroke) => {
		if (!baselineRef.current) return;
		strokesRef.current = strokesRef.current.slice(0, historyIndexRef.current);
		strokesRef.current.push(stroke);
		historyIndexRef.current = strokesRef.current.length;
		setHistoryPosition({ index: historyIndexRef.current, length: strokesRef.current.length });
		const version = ++editVersionRef.current;
		try {
			const rebuilt = await rebuildBackgroundMask(baselineRef.current, maskSize.width, maskSize.height, strokesRef.current);
			if (version === editVersionRef.current) setBaseMask(rebuilt);
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'The brush edit could not be applied.');
		}
	};

	const changeHistory = async (index: number) => {
		if (!baselineRef.current) return;
		historyIndexRef.current = index;
		setHistoryPosition({ index, length: strokesRef.current.length });
		const version = ++editVersionRef.current;
		try {
			const rebuilt = await rebuildBackgroundMask(baselineRef.current, maskSize.width, maskSize.height, strokesRef.current.slice(0, index));
			if (version === editVersionRef.current) setBaseMask(rebuilt);
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'The mask history could not be restored.');
		}
	};

	const pointFromEvent = (event: PointerEvent<HTMLDivElement>): BrushPoint => {
		const rect = event.currentTarget.getBoundingClientRect();
		return {
			x: Math.max(0, Math.min(maskSize.width, (event.clientX - rect.left) / rect.width * maskSize.width)),
			y: Math.max(0, Math.min(maskSize.height, (event.clientY - rect.top) / rect.height * maskSize.height)),
		};
	};

	const beginBrush = (event: PointerEvent<HTMLDivElement>) => {
		if (!mask || busy || previewAction !== 'brush') return;
		event.preventDefault();
		event.currentTarget.setPointerCapture(event.pointerId);
		activeStrokeRef.current = {
			mode: brushMode,
			size: brushSize * maskSize.width / Math.max(1, event.currentTarget.clientWidth),
			softness: softness / 100,
			hardness,
			points: [pointFromEvent(event)],
		};
	};

	const extendBrush = (event: PointerEvent<HTMLDivElement>) => {
		if (previewAction !== 'brush') return;
		const stroke = activeStrokeRef.current;
		if (!stroke) return;
		const point = pointFromEvent(event);
		const last = stroke.points[stroke.points.length - 1];
		if (Math.hypot(point.x - last.x, point.y - last.y) >= 1) stroke.points.push(point);
	};

	const finishBrush = () => {
		const stroke = activeStrokeRef.current;
		activeStrokeRef.current = null;
		if (stroke) void commitBrush(stroke);
	};

	const dragFocus = (event: PointerEvent<HTMLDivElement>) => {
		if (fillKind !== 'image' || !backgroundFile || previewAction !== 'move-background') return;
		if (event.type === 'pointerdown') {
			event.currentTarget.setPointerCapture(event.pointerId);
			event.preventDefault();
		}
		if (event.type === 'pointermove' && event.buttons === 0) return;
		const rect = event.currentTarget.getBoundingClientRect();
		setFocus({
			x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
			y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)),
		});
	};

	const renderFill = async (): Promise<BackgroundFill> => {
		if (fillKind === 'solid') return { kind: 'solid', color: solidColour };
		if (fillKind === 'gradient') return { kind: 'gradient', startColor: gradientStart, endColor: gradientEnd };
		if (fillKind === 'blurred') return { kind: 'blurred', blur };
		if (fillKind === 'transparent') return { kind: 'transparent' };
		if (!backgroundFile) throw new Error('Choose a background image first.');
		return { kind: 'image', bytes: await backgroundFile.arrayBuffer(), type: backgroundFile.type || 'image/jpeg', focusX: focus.x, focusY: focus.y };
	};

	const exportChanged = async () => {
		if (!file || !source || !mask) return;
		setExporting(true);
		try {
			const size = outputSize();
			if (!size) return;
			checkImageDimensions(size.width, size.height);
			const fill = await renderFill();
			const blob = await exportBackgroundImage(file, mask, maskSize.width, maskSize.height, {
				format,
				quality: quality / 100,
				backgroundColor: jpgColour,
				fill,
				outputWidth: size.width,
				outputHeight: size.height,
				shadow,
			});
			downloadImage(blob, `starmore-background-changer.${format === 'image/jpeg' ? 'jpg' : format.slice(6)}`);
			setMessage(`Downloaded ${size.width.toLocaleString()} × ${size.height.toLocaleString()} px (${formatImageBytes(blob.size)}).`);
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'The changed background could not be exported.');
		} finally {
			setExporting(false);
		}
	};

	const previewBackground = previewSurface === 'dark'
		? '#242424'
		: previewSurface === 'light'
			? '#fff'
			: 'repeating-conic-gradient(#ddd 0% 25%, #fff 0% 50%) 50% / 18px 18px';
	const size = outputSize();

	return (
		<div>
			<div className="tool-control">
				<label htmlFor="background-changer-file">Choose subject image</label>
				<input className="image-file-input" id="background-changer-file" type="file" accept={ACCEPTED} disabled={busy} onChange={(event) => { void choosePhoto(event.currentTarget.files?.[0]); }} />
			</div>
			<p className="privacy-note">Your images never leave your device. Models are downloaded from this site and saved on this device for reuse.</p>
			{lowMemory && <p className="inline-note" role="note">This device has a lower processing limit. Quick mode is safer for memory; High quality may use more.</p>}
			{source && <p className="inline-note">Source: {source.width.toLocaleString()} × {source.height.toLocaleString()} px · editable mask: {maskSize.width.toLocaleString() || '—'} × {maskSize.height.toLocaleString() || '—'} px</p>}
			<div className="tool-actions">
				<button className="tool-button" type="button" disabled={!file || busy || exporting} onClick={() => void runModel('u2netp')}>Create cutout · Quick</button>
				{mask && <button className="tool-button secondary" type="button" disabled={busy || exporting} onClick={() => void requestHighQuality()}>Get a cleaner cutout · High quality</button>}
				{busy && <button className="tool-button secondary" type="button" onClick={() => controllerRef.current?.abort()}>Cancel</button>}
			</div>
			{busy && <progress aria-label="Background processing progress" max={100} value={progress ?? undefined} />}
			<p className="tool-message" role="status">{message}</p>
			{qualityFailed && <button className="tool-button secondary" type="button" disabled={busy} onClick={() => void runModel('u2netp')}>Switch to Quick mode</button>}
			{elapsed !== null && <p className="inline-note">Processed in {elapsed.toFixed(2)} s · {model === 'isnet' ? 'High quality' : 'Quick mode'}</p>}

			{mask && <section aria-label="Cutout refinement" style={{ marginTop: 16 }}>
				<h3>Refine the subject mask</h3>
				<div className="calc-fields">
					<div className="calc-field">
						<label htmlFor="changer-brush-mode">Brush</label>
						<select id="changer-brush-mode" value={brushMode} onChange={(event) => setBrushMode(event.target.value as BrushMode)}><option value="erase">Erase</option><option value="restore">Restore</option></select>
					</div>
					<div className="calc-field">
						<label htmlFor="changer-brush-size">Brush size: {brushSize} px</label>
						<input id="changer-brush-size" type="range" min="8" max="256" value={brushSize} onChange={(event) => setBrushSize(Number(event.target.value))} />
					</div>
					<div className="calc-field">
						<label htmlFor="changer-brush-softness">Brush softness: {softness}%</label>
						<input id="changer-brush-softness" type="range" min="0" max="100" value={softness} onChange={(event) => setSoftness(Number(event.target.value))} />
					</div>
				</div>
				<div className="tool-actions">
					<button className="tool-button secondary" type="button" disabled={historyPosition.index < 1} onClick={() => void changeHistory(historyPosition.index - 1)}>Undo</button>
					<button className="tool-button secondary" type="button" disabled={historyPosition.index >= historyPosition.length} onClick={() => void changeHistory(historyPosition.index + 1)}>Redo</button>
				</div>
				<div className="calc-fields">
					<div className="calc-field"><label htmlFor="changer-hardness">Mask hardness: {hardness}%</label><input id="changer-hardness" type="range" min="0" max="100" value={hardness} onChange={(event) => setHardness(Number(event.target.value))} /></div>
					<div className="calc-field"><label htmlFor="changer-feather">Feather: {feather} px</label><input id="changer-feather" type="range" min="0" max="10" value={feather} onChange={(event) => setFeather(Number(event.target.value))} /></div>
					<div className="calc-field"><label htmlFor="changer-edge-shift">Edge shift: {edgeShift} px</label><input id="changer-edge-shift" type="range" min="-5" max="5" value={edgeShift} onChange={(event) => setEdgeShift(Number(event.target.value))} /></div>
				</div>
			</section>}

			<section aria-label="New background" style={{ marginTop: 18 }}>
				<div className="tool-control">
					<label htmlFor="background-fill-type">Background</label>
					<select id="background-fill-type" value={fillKind} onChange={(event) => setFillKind(event.target.value as FillKind)}>
						<option value="solid">Solid colour</option><option value="gradient">Gradient</option><option value="blurred">Blurred original</option><option value="image">Uploaded image</option><option value="transparent">Transparent</option>
					</select>
				</div>
				{fillKind === 'solid' && <div>
					<div className="tool-actions">{COLOUR_SWATCHES.map((colour) => <button key={colour} type="button" aria-label={`Use ${colour} background`} onClick={() => setSolidColour(colour)} style={{ width: 34, height: 34, border: solidColour === colour ? '3px solid #37694f' : '1px solid #aaa', background: colour, borderRadius: '50%' }} />)}</div>
					<label htmlFor="changer-solid-colour">Custom background colour</label> <input id="changer-solid-colour" type="color" value={solidColour} onChange={(event) => setSolidColour(event.target.value)} />
				</div>}
				{fillKind === 'gradient' && <div className="calc-fields">
					<div className="calc-field"><label htmlFor="changer-gradient-start">Gradient start</label><input id="changer-gradient-start" type="color" value={gradientStart} onChange={(event) => setGradientStart(event.target.value)} /></div>
					<div className="calc-field"><label htmlFor="changer-gradient-end">Gradient end</label><input id="changer-gradient-end" type="color" value={gradientEnd} onChange={(event) => setGradientEnd(event.target.value)} /></div>
				</div>}
				{fillKind === 'blurred' && <div className="tool-control"><label htmlFor="changer-blur">Blur strength: {blur}px</label><input id="changer-blur" type="range" min="4" max="40" value={blur} onChange={(event) => setBlur(Number(event.target.value))} /></div>}
				{fillKind === 'image' && <div className="tool-control">
					<label htmlFor="changer-background-image">Upload background image</label>
					<input className="image-file-input" id="changer-background-image" type="file" accept={ACCEPTED} onChange={(event) => chooseBackground(event.currentTarget.files?.[0])} />
					{backgroundFile && <p className="inline-note">Drag on the preview to reposition the background image.</p>}
				</div>}
			</section>

			{file && inputUrl && previewUrl && <section aria-label="Background comparison" style={{ marginTop: 16 }}>
				<div className="tool-control">
					<label htmlFor="changer-preview-surface">Preview surface</label>
					<select id="changer-preview-surface" value={previewSurface} onChange={(event) => setPreviewSurface(event.target.value as 'checkerboard' | 'light' | 'dark')}>
						<option value="checkerboard">Checkerboard</option><option value="light">Light</option><option value="dark">Dark</option>
					</select>
					{fillKind === 'image' && <><label htmlFor="changer-preview-action">Preview interaction</label><select id="changer-preview-action" value={previewAction} onChange={(event) => setPreviewAction(event.target.value as PreviewAction)}><option value="brush">Edit mask</option><option value="move-background">Move background image</option></select></>}
				</div>
				<div
					onPointerDown={dragFocus}
					onPointerMove={dragFocus}
					style={{ position: 'relative', width: '100%', maxHeight: 520, aspectRatio: `${size?.width ?? source.width} / ${size?.height ?? source.height}`, overflow: 'hidden', touchAction: fillKind === 'image' ? 'none' : undefined, cursor: fillKind === 'image' ? 'move' : undefined, background: previewBackground }}
				>
					<img src={inputUrl} alt="Original image before changing the background" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
					<img src={previewUrl} alt="Image with the new background" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', clipPath: `inset(0 0 0 ${compare}%)` }} />
					<div
						role="application"
						aria-label={`${brushMode} brush area. Drag to edit the subject mask.`}
						onPointerDown={beginBrush}
						onPointerMove={extendBrush}
						onPointerUp={finishBrush}
						onPointerCancel={finishBrush}
						style={{ position: 'absolute', inset: 0, cursor: previewAction === 'brush' ? 'crosshair' : 'default', touchAction: 'none', pointerEvents: previewAction === 'brush' ? 'auto' : 'none' }}
					/>
				</div>
				<label style={{ display: 'block', marginTop: 8 }}><span className="visually-hidden">Before and after comparison</span><input type="range" min="0" max="100" value={compare} onChange={(event) => setCompare(Number(event.target.value))} style={{ width: '100%' }} aria-label="Before and after comparison" /></label>
			</section>}

			{mask && source && <section aria-label="Export background changer" style={{ marginTop: 18 }}>
				<div className="calc-fields">
					<div className="calc-field"><label htmlFor="changer-size-preset">Output size</label><select id="changer-size-preset" value={preset} onChange={(event) => setPreset(event.target.value as SizePreset)}><option value="original">Original</option><option value="square">Square</option><option value="portrait">4:5 portrait</option><option value="widescreen">16:9 landscape</option><option value="custom">Custom</option></select></div>
					{preset === 'custom' && <>
						<div className="calc-field"><label htmlFor="changer-custom-width">Width (px)</label><input id="changer-custom-width" type="number" min="1" max={limits.maxSide} value={customWidth} onChange={(event) => setCustomWidth(Number(event.target.value))} /></div>
						<div className="calc-field"><label htmlFor="changer-custom-height">Height (px)</label><input id="changer-custom-height" type="number" min="1" max={limits.maxSide} value={customHeight} onChange={(event) => setCustomHeight(Number(event.target.value))} /></div>
					</>}
				</div>
				<label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}><input type="checkbox" checked={shadow} onChange={(event) => setShadow(event.target.checked)} /> Add a soft shadow under the subject</label>
				<div className="calc-fields" style={{ marginTop: 12 }}>
					<div className="calc-field"><label htmlFor="changer-export-format">Export format</label><select id="changer-export-format" value={format} onChange={(event) => setFormat(event.target.value as ImageOutputType)}><option value="image/png">PNG</option><option value="image/webp">WebP</option><option value="image/jpeg">JPG</option></select></div>
					{format !== 'image/png' && <div className="calc-field"><label htmlFor="changer-quality">Quality: {quality}%</label><input id="changer-quality" type="range" min="10" max="100" value={quality} onChange={(event) => setQuality(Number(event.target.value))} /></div>}
					{format === 'image/jpeg' && <div className="calc-field"><label htmlFor="changer-jpg-colour">JPG background colour</label><input id="changer-jpg-colour" type="color" value={jpgColour} onChange={(event) => setJpgColour(event.target.value)} /></div>}
				</div>
				{size && <p className="inline-note">Output: {size.width.toLocaleString()} × {size.height.toLocaleString()} px · estimated file size {formatImageBytes(estimateImageBytes(size.width, size.height, format, quality / 100))}</p>}
				<div className="tool-actions"><button className="tool-button" type="button" disabled={exporting || busy} onClick={() => void exportChanged()}>{exporting ? 'Preparing…' : 'Download changed image'}</button></div>
			</section>}

			{consentBytes !== null && <div role="dialog" aria-modal="true" aria-labelledby="changer-consent-title" className="tool-consent">
				<h2 id="changer-consent-title">Download High quality model?</h2>
				<p>This model is about {formatImageBytes(consentBytes)}. It is downloaded once and saved on this device. On mobile data this may use a lot of data.</p>
				{lowMemory && <p>High quality uses more memory. Quick mode is safer on this device.</p>}
				<div className="tool-actions"><button className="tool-button" type="button" onClick={() => consentResolverRef.current?.(true)}>Continue to High quality</button><button className="tool-button secondary" type="button" onClick={() => consentResolverRef.current?.(false)}>Keep Quick result</button></div>
			</div>}
		</div>
	);
}
