import { jsPDF } from 'jspdf';
import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { commonPhotoSizes, layoutPrintSheet, photoSizeToPixels, photoSizesLastChecked, printSheetSizes, type PhotoSize } from '../../data/photo-sizes';
import { renderPassportPhoto, renderPassportSheet, type PassportMask, type PassportRenderOptions } from '../../engines/image/passport-engine';
import { coverSourceCrop } from '../../engines/image/composition-math';
import { decodeImageFile, downloadImage, formatImageBytes, getImageLimits, type DecodedImage, type ImageOutputType } from '../../engines/image/toolkit';
import { initializeModelRuntime } from '../../engines/image/models/model-runtime';
import { loadBackgroundModel } from '../../engines/image/models/model-loader';
import type { BackgroundModelName, ModelManifest } from '../../engines/image/models/model-loader';
import { MODEL_DOWNLOAD_CONSENT_TEXT } from '../../engines/image/models/model-loader';

type BackgroundMode = 'keep' | 'white' | 'off-white' | 'light-blue' | 'quick' | 'high';
type Point = { x: number; y: number };
const ACCEPTED = 'image/jpeg,image/png,image/webp,image/gif,image/bmp,.jpg,.jpeg,.png,.webp,.gif,.bmp,.heic,.heif';
const backgroundColors: Record<Exclude<BackgroundMode, 'keep' | 'quick' | 'high'>, string> = {
	white: '#ffffff',
	'off-white': '#f5f2ea',
	'light-blue': '#dceaf5',
};

function download(blob: Blob, name: string) {
	downloadImage(blob, name);
}

export default function PassportPhotoMaker() {
	const [file, setFile] = useState<File | null>(null);
	const [source, setSource] = useState<DecodedImage | null>(null);
	const [sourceUrl, setSourceUrl] = useState('');
	const [photoUrl, setPhotoUrl] = useState('');
	const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
	const [sizeId, setSizeId] = useState(commonPhotoSizes[0].id);
	const [customWidth, setCustomWidth] = useState(35);
	const [customHeight, setCustomHeight] = useState(45);
	const [customUnit, setCustomUnit] = useState<'mm' | 'in'>('mm');
	const [zoom, setZoom] = useState(1);
	const [center, setCenter] = useState<Point>({ x: 0.5, y: 0.5 });
	const [guides, setGuides] = useState({ centerX: 50, top: 25, chin: 70 });
	const [backgroundMode, setBackgroundMode] = useState<BackgroundMode>('keep');
	const [mask, setMask] = useState<PassportMask | null>(null);
	const [brightness, setBrightness] = useState(0);
	const [contrast, setContrast] = useState(0);
	const [format, setFormat] = useState<ImageOutputType>('image/jpeg');
	const [sheetId, setSheetId] = useState<'4x6' | 'a5' | 'a4'>('4x6');
	const [busy, setBusy] = useState(false);
	const [progress, setProgress] = useState(0);
	const [consentBytes, setConsentBytes] = useState<number | null>(null);
	const [consentResolver, setConsentResolver] = useState<((accepted: boolean) => void) | null>(null);
	const [message, setMessage] = useState('Choose a photo. Everything stays on your device.');
	const dragRef = useRef<{ pointer: number; start: Point; center: Point } | null>(null);
	const modelRunRef = useRef<AbortController | null>(null);
	const consentAcceptedRef = useRef(false);

	const photoSize: PhotoSize = sizeId === 'custom'
		? { id: 'custom', name: 'Custom', width: customWidth, height: customHeight, unit: customUnit }
		: commonPhotoSizes.find((size) => size.id === sizeId) ?? commonPhotoSizes[0];
	const pixels = photoSizeToPixels(photoSize, 300);
	const aspect = photoSize.width / photoSize.height;
	const limits = getImageLimits();
	const activeMask = backgroundMode === 'keep' ? undefined : mask ?? undefined;

	useEffect(() => () => source?.bitmap.close(), [source]);
	useEffect(() => {
		if (!file) { setSourceUrl(''); return; }
		const url = URL.createObjectURL(file);
		setSourceUrl(url);
		return () => URL.revokeObjectURL(url);
	}, [file]);
	useEffect(() => {
		if (!photoUrl) return;
		return () => URL.revokeObjectURL(photoUrl);
	}, [photoUrl]);
	useEffect(() => () => modelRunRef.current?.abort(), []);

	const chooseFile = async (selected?: File) => {
		modelRunRef.current?.abort();
		setFile(null);
		setSource(null);
		setMask(null);
		setPhotoUrl('');
		setPhotoBlob(null);
		consentAcceptedRef.current = false;
		if (!selected) return;
		try {
			const decoded = await decodeImageFile(selected);
			setFile(selected);
			setSource(decoded);
			setCenter({ x: 0.5, y: 0.5 });
			setMessage(`${decoded.width.toLocaleString()} × ${decoded.height.toLocaleString()} px photo ready. Drag inside the frame to reposition.`);
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Could not open this photo. Convert it to JPG or PNG first.');
		}
	};

	const crop = source ? coverSourceCrop(source.width, source.height, aspect, zoom, center) : null;
	const renderOptions = (): PassportRenderOptions | null => source && crop ? {
		crop,
		width: pixels.width,
		height: pixels.height,
		background: backgroundMode === 'keep' ? null : backgroundMode === 'white' || backgroundMode === 'off-white' || backgroundMode === 'light-blue' ? backgroundColors[backgroundMode] : '#ffffff',
		brightness,
		contrast,
	} : null;

	const runModel = async (model: BackgroundModelName) => {
		if (!file) return;
		modelRunRef.current?.abort();
		const controller = new AbortController();
		modelRunRef.current = controller;
		setBusy(true);
		setProgress(0);
		setMessage(`Loading ${model === 'isnet' ? 'High quality' : 'Quick'} background model…`);
		try {
			const loaded = await loadBackgroundModel(model, {
				signal: controller.signal,
				onProgress: (update) => {
					setProgress(update.percent);
					setMessage(`Downloading ${formatImageBytes(update.completedBytes)} of ${formatImageBytes(update.totalBytes)} (${update.percent.toFixed(1)}%).`);
				},
				requestConsent: async () => consentAcceptedRef.current,
			});
			const runtime = await initializeModelRuntime(model, loaded, controller.signal);
			try {
				const result = await runtime.removeBackground(file);
				if (controller.signal.aborted) return;
				setMask({ data: result.mask, width: result.maskWidth, height: result.maskHeight });
				setBackgroundMode(model === 'isnet' ? 'high' : 'quick');
				setProgress(100);
				setMessage(`Background removed with ${model === 'isnet' ? 'High quality' : 'Quick'}.`);
			} finally {
				runtime.terminate();
			}
		} catch (error) {
			if (controller.signal.aborted) setMessage('Background processing cancelled.');
			else setMessage(error instanceof Error ? error.message : 'Background removal could not complete.');
		} finally {
			if (modelRunRef.current === controller) modelRunRef.current = null;
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
						return;
					}
					setMessage('High quality was not downloaded. The selected background is unchanged.');
				});
			} catch (error) {
				setMessage(error instanceof Error ? error.message : 'Could not check the model download size.');
			}
			return;
		}
		await runModel(model);
	};

	const generate = async () => {
		if (!file || !renderOptions()) { setMessage('Choose a photo before generating a passport-size image.'); return; }
		setBusy(true);
		try {
			const blob = await renderPassportPhoto(file, renderOptions()!, activeMask, format);
			setPhotoBlob(blob);
			setPhotoUrl((previous) => {
				if (previous) URL.revokeObjectURL(previous);
				return URL.createObjectURL(blob);
			});
			setMessage(`Created ${pixels.width} × ${pixels.height} px at 300 DPI · ${formatImageBytes(blob.size)}.`);
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Could not create the passport photo.');
		} finally {
			setBusy(false);
		}
	};

	const sheetLayout = () => {
		const sheet = printSheetSizes.find((item) => item.id === sheetId) ?? printSheetSizes[0];
		const layout = layoutPrintSheet(sheet, photoSize);
		const dpi = 300 / 25.4;
		return {
			sheet,
			layout,
			options: {
				...(renderOptions()!),
				sheetWidth: Math.round(sheet.widthMm * dpi),
				sheetHeight: Math.round(sheet.heightMm * dpi),
				placements: layout.placements.map((placement) => ({
					x: Math.round(placement.xMm * dpi),
					y: Math.round(placement.yMm * dpi),
					width: Math.round(placement.widthMm * dpi),
					height: Math.round(placement.heightMm * dpi),
				})),
			},
		};
	};

	const exportSheet = async (asPdf: boolean) => {
		if (!file || !renderOptions()) { setMessage('Choose a photo before creating a print sheet.'); return; }
		setBusy(true);
		setProgress(0);
		try {
			const { sheet, layout, options } = sheetLayout();
			if (!layout.copies) throw new Error('This photo size does not fit on the selected sheet with the current margins.');
			const blob = await renderPassportSheet(file, options, activeMask);
			setProgress(80);
			if (!asPdf) {
				download(blob, `passport-photo-sheet-${sheet.id}.png`);
				setMessage(`Created a ${layout.copies}-copy ${sheet.name} print sheet.`);
				return;
			}
			const pageWidth = sheet.widthMm / 25.4 * 72;
			const pageHeight = sheet.heightMm / 25.4 * 72;
			const pdf = new jsPDF({
				orientation: pageWidth > pageHeight ? 'landscape' : 'portrait',
				unit: 'pt',
				format: [pageWidth, pageHeight],
			});
			pdf.addImage(new Uint8Array(await blob.arrayBuffer()), 'PNG', 0, 0, pageWidth, pageHeight);
			download(pdf.output('blob'), `passport-photo-sheet-${sheet.id}.pdf`);
			setMessage(`Created a ${layout.copies}-copy ${sheet.name} PDF at exact physical page size.`);
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Could not create the print sheet.');
		} finally {
			setProgress(100);
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

	return <div>
		<div className="tool-control"><label htmlFor="passport-file">Choose photo</label><input id="passport-file" className="image-file-input" type="file" accept={ACCEPTED} onChange={(event) => { void chooseFile(event.currentTarget.files?.[0]); }} /></div>
		<p className="privacy-note">Your photo never leaves your device. Any optional model is downloaded from this site and saved on this device.</p>
		<div className="calc-fields" style={{ marginTop: 14 }}>
			<div className="calc-field"><label htmlFor="passport-size">Photo size</label><select id="passport-size" value={sizeId} onChange={(event) => setSizeId(event.target.value)}>{commonPhotoSizes.map((size) => <option key={size.id} value={size.id}>{size.name}</option>)}<option value="custom">Custom</option></select></div>
			{sizeId === 'custom' && <><div className="calc-field"><label htmlFor="passport-width">Width</label><input id="passport-width" type="number" min="1" max="200" value={customWidth} onChange={(event) => setCustomWidth(Number(event.target.value))} /></div><div className="calc-field"><label htmlFor="passport-height">Height</label><input id="passport-height" type="number" min="1" max="200" value={customHeight} onChange={(event) => setCustomHeight(Number(event.target.value))} /></div><div className="calc-field"><label htmlFor="passport-unit">Unit</label><select id="passport-unit" value={customUnit} onChange={(event) => setCustomUnit(event.target.value as 'mm' | 'in')}><option value="mm">mm</option><option value="in">in</option></select></div></>}
			<div className="calc-field"><label htmlFor="passport-format">Export format</label><select id="passport-format" value={format} onChange={(event) => setFormat(event.target.value as ImageOutputType)}><option value="image/jpeg">JPG</option><option value="image/png">PNG</option></select></div>
		</div>
		{source && <p className="inline-note">{photoSize.name} · {pixels.width} × {pixels.height} px at 300 DPI · sizes last checked {photoSizesLastChecked}. Sizes are generic examples, not country-specific requirements.</p>}
		<div className="calc-fields" style={{ marginTop: 14 }}>
			<div className="calc-field"><label htmlFor="passport-zoom">Zoom: {zoom.toFixed(2)}×</label><input id="passport-zoom" type="range" min="1" max="3" step="0.01" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} /></div>
			<div className="calc-field"><label htmlFor="passport-background">Background</label><select id="passport-background" value={backgroundMode} onChange={(event) => setBackgroundMode(event.target.value as BackgroundMode)}><option value="keep">Keep original</option><option value="white">White</option><option value="off-white">Off-white</option><option value="light-blue">Light blue</option><option value="quick">Remove · Quick</option><option value="high">Remove · High quality</option></select></div>
		</div>
		{(backgroundMode === 'quick' || backgroundMode === 'high') && <div className="tool-actions"><button className="tool-button secondary" type="button" disabled={!file || busy} onClick={() => void startModel(backgroundMode === 'high' ? 'isnet' : 'u2netp')}>Apply {backgroundMode === 'high' ? 'High quality' : 'Quick'} cutout</button>{limits.maxPixels < 48_000_000 && <span className="inline-note">This device has a lower image-size limit; Quick mode is the safer option.</span>}</div>}
		<div className="calc-fields" style={{ marginTop: 14 }}>
			<div className="calc-field"><label htmlFor="passport-brightness">Brightness: {brightness}</label><input id="passport-brightness" type="range" min="-30" max="30" value={brightness} onChange={(event) => setBrightness(Number(event.target.value))} /></div>
			<div className="calc-field"><label htmlFor="passport-contrast">Contrast: {contrast}</label><input id="passport-contrast" type="range" min="-30" max="30" value={contrast} onChange={(event) => setContrast(Number(event.target.value))} /></div>
		</div>
		<div className="calc-fields" style={{ marginTop: 14 }}>
			<div className="calc-field"><label htmlFor="passport-center-guide">Centre guide: {guides.centerX}%</label><input id="passport-center-guide" type="range" min="0" max="100" value={guides.centerX} onChange={(event) => setGuides((current) => ({ ...current, centerX: Number(event.target.value) }))} /></div>
			<div className="calc-field"><label htmlFor="passport-head-guide">Top-of-head guide: {guides.top}%</label><input id="passport-head-guide" type="range" min="0" max="100" value={guides.top} onChange={(event) => setGuides((current) => ({ ...current, top: Number(event.target.value) }))} /></div>
			<div className="calc-field"><label htmlFor="passport-chin-guide">Chin guide: {guides.chin}%</label><input id="passport-chin-guide" type="range" min="0" max="100" value={guides.chin} onChange={(event) => setGuides((current) => ({ ...current, chin: Number(event.target.value) }))} /></div>
		</div>
		{sourceUrl && <div style={{ position: 'relative', width: 'min(100%, 420px)', aspectRatio: `${aspect}`, overflow: 'hidden', touchAction: 'none', cursor: 'grab', border: '1px solid #bbb', marginTop: 15 }} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={() => { dragRef.current = null; }} onPointerCancel={() => { dragRef.current = null; }}>
			<img src={sourceUrl} alt="Photo crop preview; drag to reposition" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${center.x * 100}% ${center.y * 100}%`, transform: `scale(${zoom})`, pointerEvents: 'none' }} />
			<div aria-hidden="true" style={{ position: 'absolute', top: 0, bottom: 0, left: `${guides.centerX}%`, borderLeft: '1px dashed #fff', boxShadow: '0 0 1px #000' }} />
			<div aria-hidden="true" style={{ position: 'absolute', left: 0, right: 0, top: `${guides.top}%`, borderTop: '1px dashed #fff', boxShadow: '0 0 1px #000' }} />
			<div aria-hidden="true" style={{ position: 'absolute', left: 0, right: 0, top: `${guides.chin}%`, borderTop: '1px dashed #fff', boxShadow: '0 0 1px #000' }} />
		</div>}
		<div className="tool-actions"><button className="tool-button" type="button" disabled={!file || busy} onClick={() => void generate()}>{busy ? 'Processing…' : 'Create photo'}</button>{photoBlob && <button className="tool-button secondary" type="button" onClick={() => download(photoBlob, `passport-photo.${format === 'image/jpeg' ? 'jpg' : 'png'}`)}>Download photo</button>}</div>
		{photoUrl && <div className="tool-preview"><img src={photoUrl} alt={`Passport photo preview ${pixels.width} by ${pixels.height} pixels`} /></div>}
		<div className="calc-fields" style={{ marginTop: 16 }}>
			<div className="calc-field"><label htmlFor="passport-sheet">Print sheet</label><select id="passport-sheet" value={sheetId} onChange={(event) => setSheetId(event.target.value as typeof sheetId)}>{printSheetSizes.map((sheet) => <option key={sheet.id} value={sheet.id}>{sheet.name}</option>)}</select></div>
			{source && <p className="inline-note">{sheetLayout().layout.copies} copies fit · 3 mm outer margin · 2 mm gaps.</p>}
		</div>
		<div className="tool-actions"><button className="tool-button secondary" type="button" disabled={!file || busy} onClick={() => void exportSheet(false)}>Download print sheet PNG</button><button className="tool-button secondary" type="button" disabled={!file || busy} onClick={() => void exportSheet(true)}>Download print sheet PDF</button></div>
		{busy && <progress max={100} value={progress} aria-label="Processing progress" style={{ width: '100%', marginTop: 12 }} />}
		<p className="tool-message" role="status">{message}</p>
		<p className="inline-note">Requirements differ by country and document. Check the current specifications with the issuing authority; this tool does not guarantee acceptance.</p>
		{consentBytes !== null && <div role="dialog" aria-modal="true" aria-labelledby="passport-consent-title" className="tool-consent"><h2 id="passport-consent-title">Download High quality model?</h2><p>This model is about {formatImageBytes(consentBytes)}. {MODEL_DOWNLOAD_CONSENT_TEXT}</p><div className="tool-actions"><button className="tool-button" type="button" onClick={() => consentResolver?.(true)}>Continue to High quality</button><button className="tool-button secondary" type="button" onClick={() => consentResolver?.(false)}>Keep current setting</button></div></div>}
	</div>;
}
