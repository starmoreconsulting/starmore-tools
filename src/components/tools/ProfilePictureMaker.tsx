import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { coverSourceCrop } from '../../engines/image/composition-math';
import { renderProfilePicture, type ProfileBackground, type ProfileShape } from '../../engines/image/profile-engine';
import { decodeImageFile, downloadImage, formatImageBytes, getImageLimits, type DecodedImage } from '../../engines/image/toolkit';
import { initializeModelRuntime } from '../../engines/image/models/model-runtime';
import { loadBackgroundModel } from '../../engines/image/models/model-loader';
import type { BackgroundModelName, ModelManifest } from '../../engines/image/models/model-loader';
import type { PassportMask } from '../../engines/image/passport-engine';

type Point = { x: number; y: number };
const ACCEPTED = 'image/jpeg,image/png,image/webp,image/gif,image/bmp,.jpg,.jpeg,.png,.webp,.gif,.bmp,.heic,.heif';

export default function ProfilePictureMaker() {
	const [file, setFile] = useState<File | null>(null);
	const [source, setSource] = useState<DecodedImage | null>(null);
	const [sourceUrl, setSourceUrl] = useState('');
	const [previewUrl, setPreviewUrl] = useState('');
	const [zoom, setZoom] = useState(1);
	const [center, setCenter] = useState<Point>({ x: 0.5, y: 0.5 });
	const [shape, setShape] = useState<ProfileShape>('circle');
	const [background, setBackground] = useState<ProfileBackground>({ kind: 'solid', color: '#e8eef5' });
	const [useCutout, setUseCutout] = useState(false);
	const [mask, setMask] = useState<PassportMask | null>(null);
	const [ring, setRing] = useState(false);
	const [ringColor, setRingColor] = useState('#ffffff');
	const [ringWidth, setRingWidth] = useState(12);
	const [busy, setBusy] = useState(false);
	const [message, setMessage] = useState('Choose an image. Processing stays on your device.');
	const [consentBytes, setConsentBytes] = useState<number | null>(null);
	const [consentResolver, setConsentResolver] = useState<((accepted: boolean) => void) | null>(null);
	const dragRef = useRef<{ pointer: number; start: Point; center: Point } | null>(null);
	const controllerRef = useRef<AbortController | null>(null);
	const consentAcceptedRef = useRef(false);
	const limits = getImageLimits();

	useEffect(() => () => source?.bitmap.close(), [source]);
	useEffect(() => {
		if (!file) { setSourceUrl(''); return; }
		const url = URL.createObjectURL(file);
		setSourceUrl(url);
		return () => URL.revokeObjectURL(url);
	}, [file]);
	useEffect(() => {
		if (!previewUrl) return;
		return () => URL.revokeObjectURL(previewUrl);
	}, [previewUrl]);
	useEffect(() => () => controllerRef.current?.abort(), []);

	const chooseFile = async (selected?: File) => {
		controllerRef.current?.abort();
		setFile(null);
		setSource(null);
		setMask(null);
		setPreviewUrl('');
		consentAcceptedRef.current = false;
		if (!selected) return;
		try {
			const decoded = await decodeImageFile(selected);
			setFile(selected);
			setSource(decoded);
			setCenter({ x: 0.5, y: 0.5 });
			setMessage(`${decoded.width.toLocaleString()} × ${decoded.height.toLocaleString()} px image ready.`);
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Could not open this image. Convert it to JPG or PNG first.');
		}
	};

	const crop = source ? coverSourceCrop(source.width, source.height, 1, zoom, center) : null;
	const options = (size: number) => crop ? {
		crop, size, shape, background, ring, ringColor, ringWidth,
	} : null;

	const runModel = async (model: BackgroundModelName) => {
		if (!file) return;
		controllerRef.current?.abort();
		const controller = new AbortController();
		controllerRef.current = controller;
		setBusy(true);
		setMessage(`Loading ${model === 'isnet' ? 'High quality' : 'Quick'} background model…`);
		try {
			const loaded = await loadBackgroundModel(model, {
				signal: controller.signal,
				onProgress: (progress) => setMessage(`Downloading ${formatImageBytes(progress.completedBytes)} of ${formatImageBytes(progress.totalBytes)} (${progress.percent.toFixed(1)}%).`),
				requestConsent: async () => consentAcceptedRef.current,
			});
			const runtime = await initializeModelRuntime(model, loaded, controller.signal);
			try {
				const result = await runtime.removeBackground(file);
				if (controller.signal.aborted) return;
				setMask({ data: result.mask, width: result.maskWidth, height: result.maskHeight });
				setMessage(`Subject cutout ready · ${model === 'isnet' ? 'High quality' : 'Quick'}.`);
			} finally {
				runtime.terminate();
			}
		} catch (error) {
			setMessage(controller.signal.aborted ? 'Background processing cancelled.' : error instanceof Error ? error.message : 'Background removal could not complete.');
		} finally {
			if (controllerRef.current === controller) controllerRef.current = null;
			setBusy(false);
		}
	};

	const startModel = async (model: BackgroundModelName) => {
		if (model === 'isnet') {
			try {
				const response = await fetch('/models/isnet/manifest.json', { credentials: 'same-origin', cache: 'no-cache' });
				if (!response.ok) throw new Error(`The High quality model size could not be checked (HTTP ${response.status}).`);
				const manifest = await response.json() as ModelManifest;
				if (!Number.isSafeInteger(manifest.totalBytes) || manifest.totalBytes <= 0) throw new Error('The model manifest contains an invalid download size.');
				setConsentBytes(manifest.totalBytes);
				setConsentResolver(() => (accepted: boolean) => {
					setConsentBytes(null);
					setConsentResolver(null);
					if (accepted) {
						consentAcceptedRef.current = true;
						void runModel(model);
					} else setMessage('High quality was not downloaded.');
				});
			} catch (error) {
				setMessage(error instanceof Error ? error.message : 'Could not check the model size.');
			}
			return;
		}
		await runModel(model);
	};

	const render = async (size: number, preview = false) => {
		if (!file || !options(size)) { setMessage('Choose an image before creating a profile picture.'); return; }
		if (useCutout && !mask) { setMessage('Apply a Quick or High quality cutout before exporting with background removal enabled.'); return; }
		setBusy(true);
		try {
			const blob = await renderProfilePicture(file, options(size)!, useCutout ? mask ?? undefined : undefined);
			if (preview) setPreviewUrl((previous) => {
				if (previous) URL.revokeObjectURL(previous);
				return URL.createObjectURL(blob);
			});
			else downloadImage(blob, `profile-picture-${size}px.png`);
			setMessage(`Created ${size} × ${size} px profile picture · ${formatImageBytes(blob.size)}.`);
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Could not create the profile picture.');
		} finally {
			setBusy(false);
		}
	};

	const pointerDown = (event: PointerEvent<HTMLDivElement>) => {
		if (!source) return;
		event.currentTarget.setPointerCapture(event.pointerId);
		dragRef.current = { pointer: event.pointerId, start: { x: event.clientX, y: event.clientY }, center };
	};
	const pointerMove = (event: PointerEvent<HTMLDivElement>) => {
		const drag = dragRef.current;
		if (!drag || !source) return;
		const bounds = event.currentTarget.getBoundingClientRect();
		setCenter({
			x: Math.max(0, Math.min(1, drag.center.x - (event.clientX - drag.start.x) / bounds.width)),
			y: Math.max(0, Math.min(1, drag.center.y - (event.clientY - drag.start.y) / bounds.height)),
		});
	};
	const shapeStyle = shape === 'circle' ? '50%' : shape === 'rounded-square' ? '20%' : '0';

	return <div>
		<div className="tool-control"><label htmlFor="profile-file">Choose image</label><input id="profile-file" className="image-file-input" type="file" accept={ACCEPTED} onChange={(event) => { void chooseFile(event.currentTarget.files?.[0]); }} /></div>
		<p className="privacy-note">Your image never leaves your device. Any optional model is downloaded from this site and saved on this device.</p>
		{sourceUrl && <div onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={() => { dragRef.current = null; }} onPointerCancel={() => { dragRef.current = null; }} style={{ width: 'min(100%, 340px)', aspectRatio: '1', overflow: 'hidden', touchAction: 'none', cursor: 'grab', borderRadius: shapeStyle, border: ring ? `${Math.max(1, ringWidth / 3)}px solid ${ringColor}` : undefined, margin: '14px auto', background: background.kind === 'solid' ? background.color : `linear-gradient(135deg, ${background.start}, ${background.end})` }}>
			<img src={sourceUrl} alt="Position your image inside the square crop" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${center.x * 100}% ${center.y * 100}%`, transform: `scale(${zoom})`, userSelect: 'none' }} />
		</div>}
		<div className="calc-fields" style={{ marginTop: 14 }}>
			<div className="calc-field"><label htmlFor="profile-zoom">Zoom: {zoom.toFixed(2)}×</label><input id="profile-zoom" type="range" min="1" max="4" step="0.01" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} /></div>
			<div className="calc-field"><label htmlFor="profile-shape">Crop shape</label><select id="profile-shape" value={shape} onChange={(event) => setShape(event.target.value as ProfileShape)}><option value="circle">Circle</option><option value="rounded-square">Rounded square</option><option value="square">Square</option></select></div>
			<div className="calc-field"><label htmlFor="profile-bg-kind">Background style</label><select id="profile-bg-kind" value={background.kind} onChange={(event) => setBackground(event.target.value === 'gradient' ? { kind: 'gradient', start: '#dce8f4', end: '#f5e8df' } : { kind: 'solid', color: '#e8eef5' })}><option value="solid">Solid colour</option><option value="gradient">Gradient</option></select></div>
			{background.kind === 'solid' ? <div className="calc-field"><label htmlFor="profile-bg-color">Background colour</label><input id="profile-bg-color" type="color" value={background.color} onChange={(event) => setBackground({ kind: 'solid', color: event.target.value })} /></div> : <><div className="calc-field"><label htmlFor="profile-gradient-start">Gradient start</label><input id="profile-gradient-start" type="color" value={background.start} onChange={(event) => setBackground((current) => ({ kind: 'gradient', start: event.target.value, end: current.kind === 'gradient' ? current.end : '#f5e8df' }))} /></div><div className="calc-field"><label htmlFor="profile-gradient-end">Gradient end</label><input id="profile-gradient-end" type="color" value={background.end} onChange={(event) => setBackground((current) => ({ kind: 'gradient', start: current.kind === 'gradient' ? current.start : '#dce8f4', end: event.target.value }))} /></div></>}
		</div>
		<div className="tool-control"><label><input type="checkbox" checked={useCutout} onChange={(event) => { setUseCutout(event.target.checked); if (!event.target.checked) setMask(null); }} /> Remove background with AI cutout</label></div>
		{useCutout && <div className="tool-actions"><button className="tool-button secondary" type="button" disabled={!file || busy} onClick={() => void startModel('u2netp')}>Quick cutout</button><button className="tool-button secondary" type="button" disabled={!file || busy} onClick={() => void startModel('isnet')}>High quality cutout</button>{limits.maxPixels < 48_000_000 && <span className="inline-note">This device has a lower image-size limit; Quick is the safer option.</span>}{busy && <button className="tool-button secondary" type="button" onClick={() => controllerRef.current?.abort()}>Cancel</button>}</div>}
		<div className="tool-control"><label><input type="checkbox" checked={ring} onChange={(event) => setRing(event.target.checked)} /> Add ring border</label></div>
		{ring && <div className="calc-fields"><div className="calc-field"><label htmlFor="profile-ring-color">Ring colour</label><input id="profile-ring-color" type="color" value={ringColor} onChange={(event) => setRingColor(event.target.value)} /></div><div className="calc-field"><label htmlFor="profile-ring-width">Ring width: {ringWidth}px</label><input id="profile-ring-width" type="range" min="1" max="48" value={ringWidth} onChange={(event) => setRingWidth(Number(event.target.value))} /></div></div>}
		<div className="tool-actions"><button className="tool-button secondary" type="button" disabled={!file || busy} onClick={() => void render(400, true)}>Preview at 400 px</button>{[400, 800, 1080].map((size) => <button key={size} className="tool-button" type="button" disabled={!file || busy} onClick={() => void render(size)}>Export {size}px PNG</button>)}</div>
		{previewUrl && <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 18 }}><div><p className="inline-note">Social-size preview · 48 px</p><img src={previewUrl} alt="Profile preview shown at 48 pixels" width={48} height={48} style={{ objectFit: 'cover', borderRadius: shapeStyle }} /></div><div><p className="inline-note">Larger preview</p><img src={previewUrl} alt="Profile picture preview" width={144} height={144} style={{ objectFit: 'cover', borderRadius: shapeStyle }} /></div></div>}
		{busy && <progress className="tool-progress" max={100} value={0} aria-label="Processing profile picture" />}
		<p className="tool-status" aria-live="polite">{message}</p>
		{consentBytes !== null && <div role="dialog" aria-modal="true" aria-labelledby="profile-consent-title" className="tool-modal"><div className="tool-modal-content"><h2 id="profile-consent-title">Download High quality model</h2><p>{formatImageBytes(consentBytes)} will be downloaded once and saved on this device.</p><div className="tool-actions"><button className="tool-button secondary" type="button" onClick={() => consentResolver?.(false)}>Cancel</button><button className="tool-button" type="button" onClick={() => consentResolver?.(true)}>Download and continue</button></div></div></div>}
	</div>;
}
