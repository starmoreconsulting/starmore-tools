import { useEffect, useState } from 'react';
import { createCanvas, decodeImageFile, downloadImage, exportImage, type DecodedImage, type ImageOutputType } from '../../engines/image/toolkit';
import { restoreOldPhotoPixels } from '../../engines/image/old-photo';

export default function OldPhotoRestoration() {
	const [source, setSource] = useState<DecodedImage | null>(null);
	const [file, setFile] = useState<File | null>(null);
	const [inputUrl, setInputUrl] = useState('');
	const [resultUrl, setResultUrl] = useState('');
	const [resultBlob, setResultBlob] = useState<Blob | null>(null);
	const [fade, setFade] = useState(18);
	const [contrast, setContrast] = useState(18);
	const [warmth, setWarmth] = useState(12);
	const [denoise, setDenoise] = useState(20);
	const [grain, setGrain] = useState(6);
	const [format, setFormat] = useState<ImageOutputType>('image/jpeg');
	const [message, setMessage] = useState('Choose an old or faded photo to restore locally.');
	const [busy, setBusy] = useState(false);

	useEffect(() => () => source?.bitmap.close(), [source]);
	useEffect(() => {
		if (!file) { setInputUrl(''); return; }
		const url = URL.createObjectURL(file); setInputUrl(url);
		return () => URL.revokeObjectURL(url);
	}, [file]);
	useEffect(() => {
		if (!resultBlob) { setResultUrl(''); return; }
		const url = URL.createObjectURL(resultBlob); setResultUrl(url);
		return () => URL.revokeObjectURL(url);
	}, [resultBlob]);

	const chooseFile = async (selected?: File) => {
		setResultBlob(null);
		if (!selected) return;
		try {
			const decoded = await decodeImageFile(selected);
			setSource(decoded); setFile(selected);
			setMessage(`Photo ready: ${decoded.width.toLocaleString()} × ${decoded.height.toLocaleString()} px.`);
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Could not open this photo.');
		}
	};

	const restore = async () => {
		if (!source) { setMessage('Choose a photo before restoring it.'); return; }
		setBusy(true); setResultBlob(null); setMessage('Restoring the photo locally…');
		try {
			const canvas = createCanvas(source.width, source.height) as HTMLCanvasElement;
			const context = canvas.getContext('2d', { willReadFrequently: true });
			if (!context) throw new Error('Your browser could not prepare the photo pixels.');
			context.drawImage(source.bitmap, 0, 0);
			const imageData = context.getImageData(0, 0, source.width, source.height);
			const restored = restoreOldPhotoPixels(imageData.data, source.width, source.height, { fade, contrast, warmth, denoise, grain, seed: 42 });
			context.putImageData(new ImageData(restored, source.width, source.height), 0, 0);
			const blob = await exportImage(canvas, format, 0.92);
			setResultBlob(blob); setMessage(`Restored ${source.width.toLocaleString()} × ${source.height.toLocaleString()} px photo. It is an enhancement preset, not AI reconstruction.`);
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Could not restore this photo. Try a smaller image.');
		} finally { setBusy(false); }
	};

	return (
		<div>
			<div className="tool-control"><label htmlFor="old-photo-file">Choose photo</label><input id="old-photo-file" type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/bmp" onChange={(event) => void chooseFile(event.target.files?.[0])} /></div>
			{source && <div className="image-compare-grid"><figure>{inputUrl && <img src={inputUrl} alt="Original old photo" />}<figcaption>Original</figcaption></figure>{resultUrl && <figure><img src={resultUrl} alt="Restored old photo" /><figcaption>Restored</figcaption></figure>}</div>}
			<div className="calc-fields">
				<div className="calc-field"><label htmlFor="old-photo-fade">Fade reduction</label><input id="old-photo-fade" type="range" min="0" max="60" value={fade} onChange={(event) => setFade(Number(event.target.value))} /><small>{fade}%</small></div>
				<div className="calc-field"><label htmlFor="old-photo-contrast">Contrast</label><input id="old-photo-contrast" type="range" min="-40" max="80" value={contrast} onChange={(event) => setContrast(Number(event.target.value))} /><small>{contrast}</small></div>
				<div className="calc-field"><label htmlFor="old-photo-warmth">Warmth</label><input id="old-photo-warmth" type="range" min="-20" max="20" value={warmth} onChange={(event) => setWarmth(Number(event.target.value))} /><small>{warmth}</small></div>
				<div className="calc-field"><label htmlFor="old-photo-denoise">Denoise</label><input id="old-photo-denoise" type="range" min="0" max="80" value={denoise} onChange={(event) => setDenoise(Number(event.target.value))} /><small>{denoise}%</small></div>
				<div className="calc-field"><label htmlFor="old-photo-grain">Fine grain</label><input id="old-photo-grain" type="range" min="0" max="20" value={grain} onChange={(event) => setGrain(Number(event.target.value))} /><small>{grain}</small></div>
				<div className="calc-field"><label htmlFor="old-photo-format">Output format</label><select id="old-photo-format" value={format} onChange={(event) => setFormat(event.target.value as ImageOutputType)}><option value="image/jpeg">JPG</option><option value="image/png">PNG</option><option value="image/webp">WebP</option></select></div>
			</div>
			<div className="tool-actions"><button className="tool-button" type="button" onClick={() => void restore()} disabled={!source || busy}>{busy ? 'Restoring…' : 'Restore photo'}</button>{resultBlob && <button className="tool-button secondary" type="button" onClick={() => downloadImage(resultBlob, `restored-photo.${format === 'image/jpeg' ? 'jpg' : format === 'image/png' ? 'png' : 'webp'}`)}>Download image</button>}</div>
			<p className="tool-message" role="status">{message}</p>
		</div>
	);
}
