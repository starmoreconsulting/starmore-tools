import { useRef, useState } from 'react';
import QRCode from 'qrcode';

function downloadFile(contents: BlobPart, type: string, filename: string) {
	const url = URL.createObjectURL(new Blob([contents], { type }));
	const link = document.createElement('a');
	link.href = url;
	link.download = filename;
	link.click();
	window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function QrCodeGenerator() {
	const [text, setText] = useState('');
	const [size, setSize] = useState(256);
	const [dark, setDark] = useState('#202b25');
	const [light, setLight] = useState('#ffffff');
	const [png, setPng] = useState('');
	const [svg, setSvg] = useState('');
	const [message, setMessage] = useState('');
	const generation = useRef(0);

	const invalidate = () => {
		generation.current += 1;
		setPng('');
		setSvg('');
		setMessage('Settings changed. Generate the QR code to update it.');
	};

	const generate = async () => {
		const generationId = ++generation.current;
		if (!text.trim()) {
			setPng('');
			setSvg('');
			setMessage('Enter text or a URL to create a QR code.');
			return;
		}

		try {
			const [pngData, svgData] = await Promise.all([
				QRCode.toDataURL(text, { width: size, margin: 2, color: { dark, light }, errorCorrectionLevel: 'M' }),
				QRCode.toString(text, { type: 'svg', width: size, margin: 2, color: { dark, light }, errorCorrectionLevel: 'M' }),
			]);
			if (generationId !== generation.current) return;
			setPng(pngData);
			setSvg(svgData);
			setMessage('QR code generated locally in your browser.');
		} catch {
			if (generationId !== generation.current) return;
			setPng('');
			setSvg('');
			setMessage('Could not generate a QR code. Try shorter text or different colors.');
		}
	};

	return (
		<div>
			<div className="calc-field">
				<label htmlFor="qr-text">Text or URL</label>
				<textarea id="qr-text" value={text} onChange={(event) => { setText(event.target.value); invalidate(); }} placeholder="https://example.com" />
			</div>
			<div className="calc-fields three-columns" style={{ marginTop: 16 }}>
				<div className="tool-control">
					<label htmlFor="qr-size">Size: {size}px</label>
					<input id="qr-size" type="range" min="128" max="1024" step="32" value={size} onChange={(event) => { setSize(Number(event.target.value)); invalidate(); }} />
				</div>
				<div className="tool-control">
					<label htmlFor="qr-dark">Code color</label>
					<input id="qr-dark" type="color" value={dark} onChange={(event) => { setDark(event.target.value); invalidate(); }} />
				</div>
				<div className="tool-control">
					<label htmlFor="qr-light">Background color</label>
					<input id="qr-light" type="color" value={light} onChange={(event) => { setLight(event.target.value); invalidate(); }} />
				</div>
			</div>
			<div className="tool-actions">
				<button className="tool-button" type="button" onClick={generate}>Generate QR code</button>
				<button className="tool-button secondary" type="button" disabled={!png} onClick={() => downloadFile(png, 'image/png', 'starmore-qr-code.png')}>Download PNG</button>
				<button className="tool-button secondary" type="button" disabled={!svg} onClick={() => downloadFile(svg, 'image/svg+xml;charset=utf-8', 'starmore-qr-code.svg')}>Download SVG</button>
			</div>
			{png && <div className="tool-preview"><img className="tool-code-preview" src={png} alt="Generated QR code" /></div>}
			<p className="tool-message" role="status">{message || 'Enter text or a URL, then generate your QR code.'}</p>
		</div>
	);
}
