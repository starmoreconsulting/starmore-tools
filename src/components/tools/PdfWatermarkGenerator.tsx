import { useState } from 'react';
import { StandardFonts, rgb, degrees } from 'pdf-lib';
import { readPdf, triggerDownload } from '../../engines/pdf';
import { normalizeWatermarkOptions, normalizeWatermarkText, type WatermarkPosition } from '../../engines/pdf-watermark';

export default function PdfWatermarkGenerator() {
	const [file, setFile] = useState<File | null>(null);
	const [text, setText] = useState('CONFIDENTIAL');
	const [size, setSize] = useState(36);
	const [opacity, setOpacity] = useState(30);
	const [rotation, setRotation] = useState(-35);
	const [position, setPosition] = useState<WatermarkPosition>('center');
	const [tile, setTile] = useState(false);
	const [busy, setBusy] = useState(false);
	const [resultBlob, setResultBlob] = useState<Blob | null>(null);
	const [downloadName, setDownloadName] = useState('');
	const [message, setMessage] = useState('Choose a PDF and add a visible text watermark locally.');

	const addWatermark = async () => {
		if (!file) { setMessage('Choose a PDF before adding a watermark.'); return; }
		const watermark = normalizeWatermarkText(text);
		if (!watermark) { setMessage('Enter watermark text before continuing.'); return; }
		let options;
		try {
			options = normalizeWatermarkOptions(size, opacity, rotation);
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Invalid watermark options.');
			return;
		}
		setBusy(true);
		setMessage('Adding the watermark…');
		try {
			const source = await readPdf(file);
			const font = await source.embedFont(StandardFonts.HelveticaBold);
			for (const page of source.getPages()) {
				const { width, height } = page.getSize();
				const textWidth = font.widthOfTextAtSize(watermark, options.size);
				const draw = (x: number, y: number) => {
					page.drawText(watermark, {
						x,
						y,
						size: options.size,
						font,
						color: rgb(0.35, 0.42, 0.36),
						opacity: options.opacity,
						rotate: degrees(options.rotation),
					});
				};
				if (tile) {
					const spacingX = Math.max(textWidth + 80, 180);
					const spacingY = Math.max(options.size * 4, 110);
					for (let y = 40; y < height; y += spacingY) {
						for (let x = 20; x < width; x += spacingX) draw(x, y);
					}
				} else {
					const margin = 40;
					let x = margin;
					let y = margin;
					if (position.includes('center')) x = (width - textWidth) / 2;
					if (position.includes('right')) x = width - textWidth - margin;
					if (position === 'top-left' || position === 'top-center' || position === 'top-right') y = height - options.size - margin;
					if (position === 'center') y = (height - options.size) / 2;
					draw(Math.max(margin, x), Math.max(margin, y));
				}
			}
			const bytes = await source.save();
			const blob = new Blob([bytes], { type: 'application/pdf' });
			const name = file.name.replace(/\.pdf$/i, '') + '-watermarked.pdf';
			setResultBlob(blob);
			setDownloadName(name);
			triggerDownload(blob, name);
			setMessage(`Added the text watermark to ${source.getPageCount()} page${source.getPageCount() === 1 ? '' : 's'}.`);
		} catch (error) {
			setMessage(error instanceof Error ? `Could not add the watermark. ${error.message}` : 'Could not add the watermark. The PDF may be damaged or password-protected.');
		} finally {
			setBusy(false);
		}
	};

	return (
		<div>
			<div className="tool-control"><label htmlFor="pdf-watermark-file">PDF file</label><input className="image-file-input" id="pdf-watermark-file" type="file" accept="application/pdf,.pdf" onChange={(event) => { setFile(event.target.files?.[0] ?? null); setMessage(event.target.files?.[0] ? 'PDF selected. Configure the watermark.' : 'Choose a PDF file.'); }} /></div>
			<div className="calc-field"><label htmlFor="pdf-watermark-text">Watermark text</label><input id="pdf-watermark-text" type="text" maxLength={200} value={text} onChange={(event) => setText(event.target.value)} /></div>
			<div className="calc-fields">
				<div className="calc-field"><label htmlFor="pdf-watermark-size">Font size</label><input id="pdf-watermark-size" type="number" min="6" max="144" value={size} onChange={(event) => setSize(Number(event.target.value))} /></div>
				<div className="calc-field"><label htmlFor="pdf-watermark-opacity">Opacity (%)</label><input id="pdf-watermark-opacity" type="number" min="5" max="100" value={opacity} onChange={(event) => setOpacity(Number(event.target.value))} /></div>
				<div className="calc-field"><label htmlFor="pdf-watermark-rotation">Rotation (degrees)</label><input id="pdf-watermark-rotation" type="number" min="-180" max="180" value={rotation} onChange={(event) => setRotation(Number(event.target.value))} /></div>
				<div className="calc-field"><label htmlFor="pdf-watermark-position">Position</label><select id="pdf-watermark-position" value={position} onChange={(event) => setPosition(event.target.value as WatermarkPosition)} disabled={tile}><option value="top-left">Top left</option><option value="top-center">Top center</option><option value="top-right">Top right</option><option value="center">Center</option><option value="bottom-left">Bottom left</option><option value="bottom-center">Bottom center</option><option value="bottom-right">Bottom right</option></select></div>
			</div>
			<label className="duplicate-option"><input type="checkbox" checked={tile} onChange={(event) => setTile(event.target.checked)} /><span>Tile watermark across every page</span></label>
			<div className="tool-actions">
				<button className="tool-button" type="button" disabled={!file || busy} onClick={() => void addWatermark()}>{busy ? 'Adding watermark…' : 'Add watermark to PDF'}</button>
				{resultBlob && <button className="tool-button secondary" type="button" onClick={() => triggerDownload(resultBlob, downloadName)}>Download watermarked PDF</button>}
			</div>
			<p className="tool-message" role="status">{message}</p>
			<p className="privacy-note">The PDF never leaves your device. Watermarking is processed locally in this browser.</p>
		</div>
	);
}
