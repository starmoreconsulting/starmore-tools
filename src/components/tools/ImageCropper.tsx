import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { canvasToBlob, getImageExtension, getSupportedImageType, loadImage, MAX_IMAGE_PIXELS, type SupportedImageType } from '../../engines/image';

type CropRatio = 'free' | '1:1' | '4:3' | '16:9';
type CropRect = { x: number; y: number; width: number; height: number };
type Point = { x: number; y: number };
type OutputFormat = 'image/png' | 'image/jpeg';

const ratios: Record<Exclude<CropRatio, 'free'>, number> = { '1:1': 1, '4:3': 4 / 3, '16:9': 16 / 9 };

function downloadBlob(blob: Blob, type: SupportedImageType) {
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = `starmore-cropped.${getImageExtension(type)}`;
	link.click();
	window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function createCrop(start: Point, end: Point, width: number, height: number, ratio: number | null): CropRect {
	const availableWidth = end.x >= start.x ? width - start.x : start.x;
	const availableHeight = end.y >= start.y ? height - start.y : start.y;
	let cropWidth = Math.abs(end.x - start.x);
	let cropHeight = Math.abs(end.y - start.y);
	if (ratio !== null) {
		if (cropWidth / Math.max(cropHeight, 1) > ratio) cropWidth = cropHeight * ratio;
		else cropHeight = cropWidth / ratio;
		const scale = Math.min(1, availableWidth / Math.max(cropWidth, 1), availableHeight / Math.max(cropHeight, 1));
		cropWidth *= scale;
		cropHeight *= scale;
	}
	const x = end.x >= start.x ? start.x : start.x - cropWidth;
	const y = end.y >= start.y ? start.y : start.y - cropHeight;
	return {
		x: Math.max(0, Math.min(width, x)),
		y: Math.max(0, Math.min(height, y)),
		width: Math.max(0, Math.min(cropWidth, width - x)),
		height: Math.max(0, Math.min(cropHeight, height - y)),
	};
}

export default function ImageCropper() {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const startRef = useRef<Point | null>(null);
	const [file, setFile] = useState<File | null>(null);
	const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
	const [crop, setCrop] = useState<CropRect | null>(null);
	const [ratio, setRatio] = useState<CropRatio>('free');
	const [format, setFormat] = useState<OutputFormat>('image/png');
	const [message, setMessage] = useState('Choose an image, then drag over it to select a crop area.');

	useEffect(() => {
		let cancelled = false;
		const draw = async () => {
			if (!file) {
				setDimensions({ width: 0, height: 0 });
				setCrop(null);
				return;
			}
			try {
				if (!getSupportedImageType(file)) throw new Error('Choose a JPG, PNG, or WebP image file.');
				const image = await loadImage(file);
				if (image.naturalWidth * image.naturalHeight > MAX_IMAGE_PIXELS) throw new Error('This image is too large to process safely in the browser.');
				if (cancelled) return;
				const canvas = canvasRef.current;
				const context = canvas?.getContext('2d');
				if (!canvas || !context) throw new Error('Your browser could not prepare the crop preview.');
				canvas.width = image.naturalWidth;
				canvas.height = image.naturalHeight;
				context.drawImage(image, 0, 0);
				setDimensions({ width: image.naturalWidth, height: image.naturalHeight });
				setCrop({ x: 0, y: 0, width: image.naturalWidth, height: image.naturalHeight });
				setMessage('Drag on the image to choose a crop area. Your image stays on this device.');
			} catch (error) {
				if (!cancelled) {
					setCrop(null);
					setMessage(error instanceof Error ? error.message : 'Could not open this image.');
				}
			}
		};
		void draw();
		return () => { cancelled = true; };
	}, [file]);

	const pointFromEvent = (event: PointerEvent<HTMLCanvasElement>) => {
		const canvas = canvasRef.current;
		if (!canvas || dimensions.width === 0 || dimensions.height === 0) return null;
		const bounds = canvas.getBoundingClientRect();
		return {
			x: Math.max(0, Math.min(dimensions.width, (event.clientX - bounds.left) * dimensions.width / bounds.width)),
			y: Math.max(0, Math.min(dimensions.height, (event.clientY - bounds.top) * dimensions.height / bounds.height)),
		};
	};

	const pointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
		const point = pointFromEvent(event);
		if (!point) return;
		event.currentTarget.setPointerCapture(event.pointerId);
		startRef.current = point;
		setCrop({ x: point.x, y: point.y, width: 0, height: 0 });
	};

	const pointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
		if (!startRef.current) return;
		const point = pointFromEvent(event);
		if (!point) return;
		const aspect = ratio === 'free' ? null : ratios[ratio];
		setCrop(createCrop(startRef.current, point, dimensions.width, dimensions.height, aspect));
	};

	const pointerUp = (event: PointerEvent<HTMLCanvasElement>) => {
		pointerMove(event);
		startRef.current = null;
	};

	const cropImage = async () => {
		const source = canvasRef.current;
		if (!source || !file || !crop || crop.width < 1 || crop.height < 1) {
			setMessage('Choose an image and drag to select a crop area.');
			return;
		}
		try {
			const output = document.createElement('canvas');
			output.width = Math.max(1, Math.round(crop.width));
			output.height = Math.max(1, Math.round(crop.height));
			const context = output.getContext('2d');
			if (!context) throw new Error('Your browser could not prepare the cropped image.');
			if (format === 'image/jpeg') {
				context.fillStyle = '#ffffff';
				context.fillRect(0, 0, output.width, output.height);
			}
			context.drawImage(source, crop.x, crop.y, crop.width, crop.height, 0, 0, output.width, output.height);
			const blob = await canvasToBlob(output, format, format === 'image/jpeg' ? 0.92 : undefined);
			output.width = 0;
			output.height = 0;
			downloadBlob(blob, format);
			setMessage(`Cropped image downloaded (${Math.round(crop.width)} × ${Math.round(crop.height)}px).`);
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Could not crop this image.');
		}
	};

	const overlay = crop && dimensions.width > 0 && dimensions.height > 0 ? {
		left: `${crop.x / dimensions.width * 100}%`,
		top: `${crop.y / dimensions.height * 100}%`,
		width: `${crop.width / dimensions.width * 100}%`,
		height: `${crop.height / dimensions.height * 100}%`,
	} : null;

	return (
		<div>
			<div className="tool-control">
				<label htmlFor="cropper-file">Choose image</label>
				<input className="image-file-input" id="cropper-file" type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" onChange={(event) => { setFile(event.currentTarget.files?.[0] ?? null); setMessage('Loading image locally…'); }} />
			</div>
			<div className="calc-fields" style={{ marginTop: 15 }}>
				<div className="calc-field">
					<label htmlFor="cropper-ratio">Crop ratio</label>
					<select id="cropper-ratio" value={ratio} onChange={(event) => setRatio(event.target.value as CropRatio)}>
						<option value="free">Free</option>
						<option value="1:1">1:1</option>
						<option value="4:3">4:3</option>
						<option value="16:9">16:9</option>
					</select>
				</div>
				<div className="calc-field">
					<label htmlFor="cropper-format">Download format</label>
					<select id="cropper-format" value={format} onChange={(event) => setFormat(event.target.value as OutputFormat)}>
						<option value="image/png">PNG</option>
						<option value="image/jpeg">JPG</option>
					</select>
				</div>
			</div>
			{file && (
				<div className="crop-stage">
					<canvas ref={canvasRef} aria-label="Drag to select image crop area" onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={() => { startRef.current = null; }} />
					{overlay && <div className="crop-selection" style={overlay} />}
				</div>
			)}
			<div className="tool-actions">
				<button className="tool-button" type="button" disabled={!file || !crop} onClick={cropImage}>Crop and download</button>
			</div>
			<p className="tool-message" role="status">{message}</p>
			<p className="privacy-note">Your image never leaves your device. Cropping and export run locally in this browser.</p>
		</div>
	);
}
