import { useEffect, useRef, useState } from 'react';
import { canvasToBlob, loadImage } from '../../engines/image';
import { fillMask, hasMaskedPixels, inpaintMaskedPixels } from '../../engines/image/patch-mask';

export default function WatermarkRemover() {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const [file, setFile] = useState<File | null>(null);
	const [source, setSource] = useState<HTMLImageElement | null>(null);
	const [mask, setMask] = useState<Uint8ClampedArray | null>(null);
	const [brush, setBrush] = useState(24);
	const [drawing, setDrawing] = useState(false);
	const [result, setResult] = useState<Blob | null>(null);
	const [message, setMessage] = useState('Choose an image you own or are authorised to edit.');

	useEffect(() => () => { if (source?.src.startsWith('blob:')) URL.revokeObjectURL(source.src); }, [source]);

	const chooseFile = async (selected?: File) => {
		setResult(null);
		if (!selected) return;
		try {
			const image = await loadImage(selected);
			if (image.naturalWidth * image.naturalHeight > 48_000_000) throw new Error('This image is too large. Choose a smaller image under 48 million pixels.');
			setSource(image); setFile(selected); setMask(new Uint8ClampedArray(image.naturalWidth * image.naturalHeight));
			const canvas = canvasRef.current;
			if (canvas) {
				canvas.width = image.naturalWidth;
				canvas.height = image.naturalHeight;
				canvas.getContext('2d')?.drawImage(image, 0, 0);
			}
			setMessage(`Image ready: ${image.naturalWidth.toLocaleString()} × ${image.naturalHeight.toLocaleString()} px. Paint only over content you are authorised to remove.`);
		} catch (error) { setMessage(error instanceof Error ? error.message : 'Could not open this image.'); }
	};

	const pointFromEvent = (event: React.PointerEvent<HTMLCanvasElement>) => {
		const canvas = event.currentTarget;
		const rect = canvas.getBoundingClientRect();
		return { x: (event.clientX - rect.left) * canvas.width / rect.width, y: (event.clientY - rect.top) * canvas.height / rect.height };
	};

	const paint = (event: React.PointerEvent<HTMLCanvasElement>) => {
		if (!drawing || !source || !mask) return;
		const point = pointFromEvent(event);
		setMask((current) => current ? fillMask(current, source.naturalWidth, source.naturalHeight, point.x - 1, point.y, point.x, point.y, brush) : current);
		const canvas = canvasRef.current;
		const context = canvas?.getContext('2d');
		if (context) {
			context.beginPath(); context.fillStyle = 'rgba(255, 210, 105, 0.55)'; context.arc(point.x, point.y, brush, 0, Math.PI * 2); context.fill();
		}
	};

	const applyPatch = async () => {
		if (!source || !mask || !hasMaskedPixels(mask)) { setMessage('Paint over the area you want to patch first.'); return; }
		try {
			const canvas = canvasRef.current;
			if (!canvas) throw new Error('The image canvas is unavailable.');
			const context = canvas.getContext('2d', { willReadFrequently: true });
			if (!context) throw new Error('Your browser could not prepare the image.');
			const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
			const restored = inpaintMaskedPixels(imageData.data, mask, canvas.width, canvas.height, 18);
			context.putImageData(new ImageData(restored, canvas.width, canvas.height), 0, 0);
			const blob = await canvasToBlob(canvas, 'image/png');
			setResult(blob); setMask(new Uint8ClampedArray(canvas.width * canvas.height)); setMessage('Patch applied locally. Review carefully: this simple patcher is not AI reconstruction.');
		} catch (error) { setMessage(error instanceof Error ? error.message : 'Could not apply the patch.'); }
	};

	const download = () => {
		if (!result) return;
		const url = URL.createObjectURL(result);
		const link = document.createElement('a'); link.href = url; link.download = 'patched-image.png'; link.click(); URL.revokeObjectURL(url);
	};

	return (
		<div>
			<div className="tool-control"><label htmlFor="watermark-remover-file">Choose user-owned image</label><input id="watermark-remover-file" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void chooseFile(event.target.files?.[0])} /></div>
			{source && <canvas ref={canvasRef} aria-label="Paint over the area to patch" className="watermark-canvas" onPointerDown={(event) => { setDrawing(true); paint(event); }} onPointerMove={paint} onPointerUp={() => setDrawing(false)} onPointerLeave={() => setDrawing(false)} />}
			<div className="calc-field"><label htmlFor="watermark-brush">Brush size</label><input id="watermark-brush" type="range" min="4" max="80" value={brush} onChange={(event) => setBrush(Number(event.target.value))} /><small>{brush}px</small></div>
			<div className="tool-actions"><button className="tool-button" type="button" onClick={() => void applyPatch()} disabled={!source}>Apply patch</button>{result && <button className="tool-button secondary" type="button" onClick={download}>Download PNG</button>}<button className="tool-button secondary" type="button" onClick={() => { if (source && canvasRef.current) { canvasRef.current.getContext('2d')?.drawImage(source, 0, 0); setMask(new Uint8ClampedArray(source.naturalWidth * source.naturalHeight)); setResult(null); setMessage('Mask cleared; the original image is displayed again.'); } }} disabled={!source}>Clear mask</button></div>
			<p className="tool-message" role="status">{message}</p>
		</div>
	);
}
