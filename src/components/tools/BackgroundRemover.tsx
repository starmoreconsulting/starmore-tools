import { useEffect, useRef, useState, type PointerEvent } from 'react';
import {
	exportBackgroundImage,
	exportBackgroundMask,
	rebuildBackgroundMask,
	refineBackgroundMask,
	type BrushMode,
	type BrushStroke,
} from '../../engines/image/background-engine';
import {
	decodeImageFile,
	downloadImage,
	estimateImageBytes,
	formatImageBytes,
	getImageLimits,
	type DecodedImage,
	type ImageOutputType,
} from '../../engines/image/toolkit';
import { initializeModelRuntime } from '../../engines/image/models/model-runtime';
import { loadBackgroundModel, removeDownloadedModels } from '../../engines/image/models/model-loader';
import type { BackgroundModelName, ModelManifest } from '../../engines/image/models/model-loader';

type PreviewSurface = 'checkerboard' | 'light' | 'dark' | 'colour';
type BrushPoint = { x: number; y: number };

const ACCEPTED = 'image/jpeg,image/png,image/webp,image/gif,image/bmp,.jpg,.jpeg,.png,.webp,.gif,.bmp,.heic,.heif';

export default function BackgroundRemover() {
	const [file, setFile] = useState<File | null>(null);
	const [source, setSource] = useState<DecodedImage | null>(null);
	const [inputUrl, setInputUrl] = useState('');
	const [previewUrl, setPreviewUrl] = useState('');
	const [baseMask, setBaseMask] = useState<Uint8Array | null>(null);
	const [mask, setMask] = useState<Uint8Array | null>(null);
	const [maskSize, setMaskSize] = useState({ width: 0, height: 0 });
	const [mode, setMode] = useState<BackgroundModelName>('u2netp');
	const [busy, setBusy] = useState(false);
	const [progress, setProgress] = useState<number | null>(0);
	const [message, setMessage] = useState('Choose an image. Processing stays entirely on your device.');
	const [elapsed, setElapsed] = useState<number | null>(null);
	const [qualityFailed, setQualityFailed] = useState(false);
	const [consentBytes, setConsentBytes] = useState<number | null>(null);
	const [surface, setSurface] = useState<PreviewSurface>('checkerboard');
	const [previewColour, setPreviewColour] = useState('#c9d8bd');
	const [compare, setCompare] = useState(50);
	const [brushMode, setBrushMode] = useState<BrushMode>('erase');
	const [brushSize, setBrushSize] = useState(64);
	const [softness, setSoftness] = useState(35);
	const [hardness, setHardness] = useState(50);
	const [feather, setFeather] = useState(0);
	const [edgeShift, setEdgeShift] = useState(0);
	const [historyPosition, setHistoryPosition] = useState({ index: 0, length: 0 });
	const [format, setFormat] = useState<ImageOutputType>('image/png');
	const [quality, setQuality] = useState(90);
	const [jpgColour, setJpgColour] = useState('#ffffff');
	const [exporting, setExporting] = useState(false);

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

	useEffect(() => {
		if (!file || !source || !mask || !maskSize.width || !maskSize.height) {
			setPreviewUrl('');
			return;
		}
		let cancelled = false;
		let objectUrl = '';
		const timer = window.setTimeout(() => {
			const scale = Math.min(1, 1000 / Math.max(source.width, source.height));
			void exportBackgroundImage(file, mask, maskSize.width, maskSize.height, {
				format: 'image/png',
				quality: 1,
				backgroundColor: '#ffffff',
				outputWidth: Math.max(1, Math.round(source.width * scale)),
				outputHeight: Math.max(1, Math.round(source.height * scale)),
			}).then((blob) => {
				if (cancelled) return;
				objectUrl = URL.createObjectURL(blob);
				setPreviewUrl(objectUrl);
			}).catch((error: unknown) => {
				if (!cancelled) setMessage(error instanceof Error ? error.message : 'The preview could not be rendered.');
			});
		}, 120);
		return () => {
			cancelled = true;
			window.clearTimeout(timer);
			if (objectUrl) URL.revokeObjectURL(objectUrl);
		};
	}, [file, source, mask, maskSize]);

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

	const pickImage = async (selected?: File) => {
		controllerRef.current?.abort();
		setSource(null);
		setFile(null);
		setBaseMask(null);
		setMask(null);
		setPreviewUrl('');
		setElapsed(null);
		setQualityFailed(false);
		strokesRef.current = [];
		historyIndexRef.current = 0;
		setHistoryPosition({ index: 0, length: 0 });
		if (!selected) return;
		try {
			const decoded = await decodeImageFile(selected);
			setSource(decoded);
			setFile(selected);
			setMessage(`Image ready: ${decoded.width.toLocaleString()} × ${decoded.height.toLocaleString()} px. Choose Quick mode to make a cutout.`);
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'This image could not be opened. Convert it to JPG or PNG first.');
		}
	};

	const runModel = async (model: BackgroundModelName) => {
		if (!file) {
			setMessage('Choose an image before removing its background.');
			return;
		}
		controllerRef.current?.abort();
		const controller = new AbortController();
		controllerRef.current = controller;
		setBusy(true);
		setProgress(0);
		setElapsed(null);
		setQualityFailed(false);
		setMessage(model === 'isnet' ? 'Loading the high-quality model…' : 'Loading the Quick model…');
		try {
			const loaded = await loadBackgroundModel(model, {
				signal: controller.signal,
				onProgress: (update) => {
					setProgress(10 + update.percent * 0.65);
					setMessage(`Downloading ${model === 'isnet' ? 'high-quality' : 'Quick'} model: ${formatImageBytes(update.completedBytes)} of ${formatImageBytes(update.totalBytes)} (${update.percent.toFixed(1)}%).`);
				},
				requestConsent: async () => consentAcceptedRef.current,
			});
			if (controller.signal.aborted) return;
			setMessage('Starting the model in a background worker…');
			setProgress(80);
			const runtime = await initializeModelRuntime(model, loaded, controller.signal);
			try {
				setMessage(`Processing with ${model === 'isnet' ? 'High quality' : 'Quick mode'} in a background worker…`);
				setProgress(null);
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
				setMode(model);
				setElapsed(seconds);
				setProgress(100);
				setQualityFailed(false);
				setMessage(`Processed in ${seconds.toFixed(2)} s with ${model === 'isnet' ? 'High quality' : 'Quick mode'}.`);
			} finally {
				runtime.terminate();
			}
		} catch (error) {
			if (controller.signal.aborted || (error instanceof Error && error.name === 'AbortError')) {
				setMessage('Processing cancelled. Your original image is unchanged.');
			} else {
				setMessage(error instanceof Error ? error.message : 'Background removal could not complete.');
				if (model === 'isnet') setQualityFailed(true);
			}
		} finally {
			if (controllerRef.current === controller) controllerRef.current = null;
			setBusy(false);
		}
	};

	const requestHighQuality = async () => {
		if (!file) return;
		if (lowMemory) {
			setMessage('High quality uses more memory. Quick mode is safer on this device; continue only if you are comfortable with the extra memory use.');
		}
		try {
			const response = await fetch('/models/isnet/manifest.json', { credentials: 'same-origin', cache: 'no-cache' });
			if (!response.ok) throw new Error(`The High quality model size could not be checked (HTTP ${response.status}).`);
			const manifest = await response.json() as ModelManifest;
			if (!Number.isSafeInteger(manifest.totalBytes) || manifest.totalBytes <= 0) {
				throw new Error('The High quality model manifest contains an invalid download size.');
			}
			if (!consentAcceptedRef.current) {
				setConsentBytes(manifest.totalBytes);
				const accepted = await new Promise<boolean>((resolve) => {
					consentResolverRef.current = resolve;
				});
				consentResolverRef.current = null;
				setConsentBytes(null);
				if (!accepted) {
					setMessage('High quality was not downloaded. Your Quick result is unchanged.');
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

	const cancel = () => controllerRef.current?.abort();

	const commitBrush = async (stroke: BrushStroke) => {
		const base = baselineRef.current;
		if (!base) return;
		strokesRef.current = strokesRef.current.slice(0, historyIndexRef.current);
		strokesRef.current.push(stroke);
		historyIndexRef.current = strokesRef.current.length;
		setHistoryPosition({ index: historyIndexRef.current, length: strokesRef.current.length });
		const version = ++editVersionRef.current;
		try {
			const rebuilt = await rebuildBackgroundMask(base, maskSize.width, maskSize.height, strokesRef.current);
			if (version === editVersionRef.current) setBaseMask(rebuilt);
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'The brush edit could not be applied.');
		}
	};

	const restoreHistory = async (index: number) => {
		const base = baselineRef.current;
		if (!base) return;
		historyIndexRef.current = index;
		setHistoryPosition({ index, length: strokesRef.current.length });
		const version = ++editVersionRef.current;
		try {
			const rebuilt = await rebuildBackgroundMask(base, maskSize.width, maskSize.height, strokesRef.current.slice(0, index));
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

	const beginStroke = (event: PointerEvent<HTMLDivElement>) => {
		if (!mask || busy) return;
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

	const extendStroke = (event: PointerEvent<HTMLDivElement>) => {
		const stroke = activeStrokeRef.current;
		if (!stroke) return;
		const point = pointFromEvent(event);
		const last = stroke.points[stroke.points.length - 1];
		if (Math.hypot(point.x - last.x, point.y - last.y) >= 1) stroke.points.push(point);
	};

	const finishStroke = () => {
		const stroke = activeStrokeRef.current;
		activeStrokeRef.current = null;
		if (stroke) void commitBrush(stroke);
	};

	const exportSelected = async () => {
		if (!file || !mask || !source) return;
		setExporting(true);
		try {
			const blob = await exportBackgroundImage(file, mask, maskSize.width, maskSize.height, {
				format,
				quality: quality / 100,
				backgroundColor: jpgColour,
			});
			downloadImage(blob, `starmore-background-removed.${format === 'image/jpeg' ? 'jpg' : format.slice(6)}`);
			setMessage(`Downloaded ${source.width.toLocaleString()} × ${source.height.toLocaleString()} px (${formatImageBytes(blob.size)}).`);
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'The cutout could not be exported.');
		} finally {
			setExporting(false);
		}
	};

	const exportMaskFile = async () => {
		if (!file || !mask) return;
		setExporting(true);
		try {
			const blob = await exportBackgroundMask(file, mask, maskSize.width, maskSize.height);
			downloadImage(blob, 'starmore-background-mask.png');
			setMessage(`Downloaded mask PNG (${formatImageBytes(blob.size)}).`);
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'The mask could not be exported.');
		} finally {
			setExporting(false);
		}
	};

	const clearSavedModels = async () => {
		if (!window.confirm('Remove downloaded background models saved on this device?')) return;
		try {
			await removeDownloadedModels();
			consentAcceptedRef.current = false;
			setMessage('Downloaded background models were removed from this device.');
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Saved models could not be removed.');
		}
	};

	const setConsent = (accepted: boolean) => {
		consentResolverRef.current?.(accepted);
	};

	const previewBackground = surface === 'checkerboard'
		? 'repeating-conic-gradient(#ddd 0% 25%, #fff 0% 50%) 50% / 18px 18px'
		: surface === 'dark' ? '#242424' : surface === 'colour' ? previewColour : '#fff';

	return (
		<div>
			<div className="tool-control">
				<label htmlFor="background-remover-file">Choose image</label>
				<input className="image-file-input" id="background-remover-file" type="file" accept={ACCEPTED} disabled={busy} onChange={(event) => { void pickImage(event.currentTarget.files?.[0]); }} />
			</div>
			<p className="privacy-note">Your image never leaves your device. The model is downloaded from this site and saved on this device for reuse.</p>
			{lowMemory && <p className="inline-note" role="note">This device has a lower processing limit. Quick mode stays selected; High quality may use more memory.</p>}
			{source && <p className="inline-note">Image: {source.width.toLocaleString()} × {source.height.toLocaleString()} px · editable mask: {maskSize.width.toLocaleString() || '—'} × {maskSize.height.toLocaleString() || '—'} px · estimated PNG {formatImageBytes(estimateImageBytes(source.width, source.height, 'image/png', 1))}</p>}

			<div className="tool-actions">
				<button className="tool-button" type="button" disabled={!file || busy || exporting} onClick={() => void runModel('u2netp')}>{busy && mode === 'u2netp' ? 'Processing Quick…' : 'Remove background · Quick'}</button>
				{mask && <button className="tool-button secondary" type="button" disabled={busy || exporting} onClick={() => void requestHighQuality()}>Get a cleaner cutout · High quality</button>}
				{busy && <button className="tool-button secondary" type="button" onClick={cancel}>Cancel</button>}
				<button className="tool-button secondary" type="button" disabled={busy || exporting} onClick={() => void clearSavedModels()}>Remove downloaded models</button>
			</div>
			{busy && <progress aria-label="Background removal progress" max={100} value={progress ?? undefined} />}
			<p className="tool-message" role="status">{message}</p>
			{qualityFailed && <button className="tool-button secondary" type="button" disabled={busy || !file} onClick={() => void runModel('u2netp')}>Switch to Quick mode</button>}
			{elapsed !== null && <p className="inline-note">Processed in {elapsed.toFixed(2)} s · {mode === 'isnet' ? 'High quality (IS-Net)' : 'Quick (U²-Netp)'}</p>}

			{mask && <section aria-label="Mask refinement">
				<div className="calc-fields">
					<div className="calc-field">
						<label htmlFor="background-brush-mode">Brush</label>
						<select id="background-brush-mode" value={brushMode} onChange={(event) => setBrushMode(event.target.value as BrushMode)}>
							<option value="erase">Erase</option><option value="restore">Restore</option>
						</select>
					</div>
					<div className="calc-field">
						<label htmlFor="background-brush-size">Brush size: {brushSize} px</label>
						<input id="background-brush-size" type="range" min="8" max="256" step="1" value={brushSize} onChange={(event) => setBrushSize(Number(event.target.value))} />
					</div>
					<div className="calc-field">
						<label htmlFor="background-brush-softness">Brush softness: {softness}%</label>
						<input id="background-brush-softness" type="range" min="0" max="100" step="1" value={softness} onChange={(event) => setSoftness(Number(event.target.value))} />
					</div>
				</div>
				<div className="tool-actions">
					<button className="tool-button secondary" type="button" disabled={historyPosition.index < 1} onClick={() => void restoreHistory(historyPosition.index - 1)}>Undo</button>
					<button className="tool-button secondary" type="button" disabled={historyPosition.index >= historyPosition.length} onClick={() => void restoreHistory(historyPosition.index + 1)}>Redo</button>
				</div>
				<div className="calc-fields">
					<div className="calc-field">
						<label htmlFor="background-hardness">Mask hardness: {hardness}%</label>
						<input id="background-hardness" type="range" min="0" max="100" step="1" value={hardness} onChange={(event) => setHardness(Number(event.target.value))} />
					</div>
					<div className="calc-field">
						<label htmlFor="background-feather">Feather: {feather} px</label>
						<input id="background-feather" type="range" min="0" max="10" step="1" value={feather} onChange={(event) => setFeather(Number(event.target.value))} />
					</div>
					<div className="calc-field">
						<label htmlFor="background-edge-shift">Edge shift: {edgeShift} px</label>
						<input id="background-edge-shift" type="range" min="-5" max="5" step="1" value={edgeShift} onChange={(event) => setEdgeShift(Number(event.target.value))} />
					</div>
				</div>
			</section>}

			{file && inputUrl && <section aria-label="Before and after preview" style={{ marginTop: 18 }}>
				<div className="tool-control">
					<label htmlFor="background-preview-surface">Cutout preview</label>
					<select id="background-preview-surface" value={surface} onChange={(event) => setSurface(event.target.value as PreviewSurface)}>
						<option value="checkerboard">Checkerboard</option><option value="light">Light</option><option value="dark">Dark</option><option value="colour">Colour</option>
					</select>
					{surface === 'colour' && <input aria-label="Preview background colour" type="color" value={previewColour} onChange={(event) => setPreviewColour(event.target.value)} />}
				</div>
				{previewUrl && <div style={{ position: 'relative', width: '100%', maxHeight: 520, aspectRatio: `${source?.width ?? 1} / ${source?.height ?? 1}`, overflow: 'hidden', background: previewBackground, touchAction: 'none' }}>
					<img src={inputUrl} alt="Original image before background removal" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
					<img src={previewUrl} alt="Cutout after background removal" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', clipPath: `inset(0 0 0 ${compare}%)` }} />
					<div
						role="application"
						aria-label={`${brushMode} brush area. Drag to edit the mask.`}
						onPointerDown={beginStroke}
						onPointerMove={extendStroke}
						onPointerUp={finishStroke}
						onPointerCancel={finishStroke}
						style={{ position: 'absolute', inset: 0, cursor: 'crosshair', touchAction: 'none' }}
					/>
					{elapsed !== null && <span style={{ position: 'absolute', left: 8, bottom: 8, padding: '2px 6px', background: '#fffE', fontSize: 12 }}>Before / After · {compare}%</span>}
				</div>}
				<label style={{ display: 'block', marginTop: 8 }}>
					<span className="visually-hidden">Before and after comparison</span>
					<input type="range" min="0" max="100" value={compare} onChange={(event) => setCompare(Number(event.target.value))} style={{ width: '100%' }} aria-label="Before and after comparison" />
				</label>
				<p className="inline-note">Drag on the image to erase or restore. Brush edits are replayable; undo and redo keep at least 30 edits.</p>
			</section>}

			{mask && source && <section aria-label="Background removal export" style={{ marginTop: 18 }}>
				<div className="calc-fields">
					<div className="calc-field">
						<label htmlFor="background-export-format">Export format</label>
						<select id="background-export-format" value={format} onChange={(event) => setFormat(event.target.value as ImageOutputType)}>
							<option value="image/png">PNG · transparent</option><option value="image/webp">WebP · transparent</option><option value="image/jpeg">JPG</option>
						</select>
					</div>
					{format !== 'image/png' && <div className="calc-field">
						<label htmlFor="background-export-quality">Quality: {quality}%</label>
						<input id="background-export-quality" type="range" min="10" max="100" value={quality} onChange={(event) => setQuality(Number(event.target.value))} />
					</div>}
					{format === 'image/jpeg' && <div className="calc-field">
						<label htmlFor="background-jpg-colour">JPG background colour</label>
						<input id="background-jpg-colour" type="color" value={jpgColour} onChange={(event) => setJpgColour(event.target.value)} />
					</div>}
				</div>
				<p className="inline-note">Output: {source.width.toLocaleString()} × {source.height.toLocaleString()} px · estimated file size {formatImageBytes(estimateImageBytes(source.width, source.height, format, quality / 100))}</p>
				<div className="tool-actions">
					<button className="tool-button" type="button" disabled={exporting || busy} onClick={() => void exportSelected()}>{exporting ? 'Preparing…' : `Download ${format === 'image/jpeg' ? 'JPG' : format.slice(6)}`}</button>
					<button className="tool-button secondary" type="button" disabled={exporting || busy} onClick={() => void exportMaskFile()}>Download mask PNG</button>
				</div>
			</section>}

			{consentBytes !== null && <div role="dialog" aria-modal="true" aria-labelledby="background-consent-title" className="tool-consent">
				<h2 id="background-consent-title">Download High quality model?</h2>
				<p>This model is about {formatImageBytes(consentBytes)}. It is downloaded once and saved on this device. On mobile data this may use a lot of data.</p>
				{lowMemory && <p>This device has a lower processing limit. Quick mode remains available and is safer for memory.</p>}
				<div className="tool-actions">
					<button className="tool-button" type="button" onClick={() => setConsent(true)}>Continue to High quality</button>
					<button className="tool-button secondary" type="button" onClick={() => setConsent(false)}>Keep Quick result</button>
				</div>
			</div>}
		</div>
	);
}
