import { useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';

const MAX_BARCODE_LENGTH = 80;

function downloadBlob(blob: Blob, filename: string): void {
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = filename;
	link.click();
	window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function createPng(svg: SVGSVGElement): Promise<Blob> {
	const svgBlob = new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml;charset=utf-8' });
	const url = URL.createObjectURL(svgBlob);
	try {
		const image = new Image();
		await new Promise<void>((resolve, reject) => {
			image.onload = () => resolve();
			image.onerror = () => reject(new Error('The barcode preview could not be prepared as a PNG.'));
			image.src = url;
		});
		const width = Number.parseFloat(svg.getAttribute('width') ?? '');
		const height = Number.parseFloat(svg.getAttribute('height') ?? '');
		if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
			throw new Error('The barcode dimensions are invalid. Generate it again before downloading.');
		}
		const canvas = document.createElement('canvas');
		canvas.width = Math.ceil(width * 2);
		canvas.height = Math.ceil(height * 2);
		const context = canvas.getContext('2d');
		if (!context) throw new Error('Your browser could not prepare the PNG canvas.');
		context.drawImage(image, 0, 0, canvas.width, canvas.height);
		return await new Promise<Blob>((resolve, reject) => {
			canvas.toBlob((blob) => blob
				? resolve(blob)
				: reject(new Error('Your browser could not export the barcode as a PNG.')), 'image/png');
		});
	} finally {
		URL.revokeObjectURL(url);
	}
}

export default function BarcodeGenerator() {
	const svgRef = useRef<SVGSVGElement>(null);
	const [value, setValue] = useState('');
	const [displayValue, setDisplayValue] = useState(true);
	const [barcodeReady, setBarcodeReady] = useState(false);
	const [message, setMessage] = useState('Enter a value to generate a Code 128 barcode locally.');
	const [isDownloading, setIsDownloading] = useState(false);

	const invalidate = () => {
		setBarcodeReady(false);
		if (svgRef.current) svgRef.current.replaceChildren();
		setMessage('Settings changed. Generate the barcode again to update it.');
	};

	const generate = () => {
		if (!value) {
			setBarcodeReady(false);
			setMessage('Enter a value for the barcode.');
			return;
		}
		if (value.length > MAX_BARCODE_LENGTH) {
			setBarcodeReady(false);
			setMessage(`Keep the value to ${MAX_BARCODE_LENGTH} characters or fewer for a readable barcode.`);
			return;
		}
		if (!svgRef.current) {
			setMessage('The barcode preview is unavailable. Refresh the page and try again.');
			return;
		}

		try {
			JsBarcode(svgRef.current, value, {
				format: 'CODE128',
				displayValue,
				lineColor: '#111827',
				background: '#ffffff',
				width: 2,
				height: 96,
				margin: 16,
				font: 'Arial',
			});
			setBarcodeReady(true);
			setMessage('Code 128 barcode generated on this device. Check that the barcode scans before use.');
		} catch {
			setBarcodeReady(false);
			svgRef.current.replaceChildren();
			setMessage('Could not encode this value. Code 128 supports printable English letters, numbers, and standard punctuation.');
		}
	};

	const downloadSvg = () => {
		if (!svgRef.current || !barcodeReady) return;
		const contents = new XMLSerializer().serializeToString(svgRef.current);
		downloadBlob(new Blob([contents], { type: 'image/svg+xml;charset=utf-8' }), 'starmore-barcode.svg');
	};

	const downloadPng = async () => {
		if (!svgRef.current || !barcodeReady) return;
		setIsDownloading(true);
		try {
			downloadBlob(await createPng(svgRef.current), 'starmore-barcode.png');
			setMessage('Barcode PNG downloaded.');
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Could not download the barcode PNG.');
		} finally {
			setIsDownloading(false);
		}
	};

	return (
		<div>
			<div className="calc-field">
				<label htmlFor="barcode-value">Text or number (up to {MAX_BARCODE_LENGTH} characters)</label>
				<input
					id="barcode-value"
					type="text"
					value={value}
					maxLength={MAX_BARCODE_LENGTH}
					onChange={(event) => { setValue(event.target.value); invalidate(); }}
					autoComplete="off"
					spellCheck={false}
					placeholder="e.g. ITEM-2048"
				/>
			</div>
			<label className="tool-choice" style={{ marginTop: 16 }}>
				<input
					type="checkbox"
					checked={displayValue}
					onChange={(event) => { setDisplayValue(event.target.checked); invalidate(); }}
				/>
				<span>Show readable text below barcode</span>
			</label>
			<div className="tool-actions">
				<button className="tool-button" type="button" onClick={generate}>Generate barcode</button>
				<button className="tool-button secondary" type="button" onClick={downloadSvg} disabled={!barcodeReady}>Download SVG</button>
				<button className="tool-button secondary" type="button" onClick={downloadPng} disabled={!barcodeReady || isDownloading}>
					{isDownloading ? 'Preparing PNG…' : 'Download PNG'}
				</button>
			</div>
			<div
				className="tool-preview"
				aria-label="Generated Code 128 barcode"
				style={{ display: barcodeReady ? undefined : 'none' }}
			>
				<svg
					ref={svgRef}
					role={barcodeReady ? 'img' : undefined}
					aria-label={barcodeReady ? `Code 128 barcode for ${value}` : undefined}
					aria-hidden={!barcodeReady}
				/>
			</div>
			<p className="tool-message" role="status">{message}</p>
			<p className="tool-message">
				Uses Code 128 locally in your browser. Barcode scanning and acceptance depend on the receiving scanner or system; verify before printing or using for inventory.
			</p>
		</div>
	);
}
