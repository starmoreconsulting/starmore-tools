import { useState } from 'react';
import { zipSync } from 'fflate';

export default function PdfToImageConverter() {
	const [file, setFile] = useState<File | null>(null);
	const [format, setFormat] = useState<'png' | 'jpeg'>('png');
	const [scale, setScale] = useState(1);
	const [busy, setBusy] = useState(false);
	const [message, setMessage] = useState('Choose a PDF to render pages locally as PNG or JPG images.');

	const convert = async () => {
		if (!file) { setMessage('Choose a PDF before converting.'); return; }
		setBusy(true);
		setMessage('Loading the local PDFium renderer…');
		try {
			const { openPdf } = await import('clawpdf/browser');
			const bytes = new Uint8Array(await file.arrayBuffer());
			const pdf = await openPdf(bytes);
			try {
				const outputs: Record<string, Uint8Array> = {};
				for (let pageNumber = 1; pageNumber <= pdf.pageCount; pageNumber += 1) {
					setMessage(`Rendering page ${pageNumber} of ${pdf.pageCount}…`);
					const pngBytes = await pdf.page(pageNumber).png({ scale, forms: true, background: 'white' });
					let outputBytes = new Uint8Array(pngBytes);
					let extension = 'png';
					if (format === 'jpeg') {
						const pngBlob = new Blob([outputBytes], { type: 'image/png' });
						const bitmap = await createImageBitmap(pngBlob);
						const canvas = document.createElement('canvas');
						canvas.width = bitmap.width;
						canvas.height = bitmap.height;
						const context = canvas.getContext('2d');
						if (!context) throw new Error('Your browser could not prepare the JPG canvas.');
						context.fillStyle = '#ffffff';
						context.fillRect(0, 0, canvas.width, canvas.height);
						context.drawImage(bitmap, 0, 0);
						const jpgBlob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error('Could not encode the JPG page.')), 'image/jpeg', 0.92));
						outputBytes = new Uint8Array(await jpgBlob.arrayBuffer());
						bitmap.close();
						extension = 'jpg';
						canvas.width = 0;
						canvas.height = 0;
					}
					outputs[`page-${String(pageNumber).padStart(3, '0')}.${extension}`] = outputBytes;
				}
				const archive = zipSync(outputs, { level: 6 });
				const url = URL.createObjectURL(new Blob([archive], { type: 'application/zip' }));
				const link = document.createElement('a');
				link.href = url;
				link.download = file.name.replace(/\.pdf$/i, '') + '-pages.zip';
				link.click();
				window.setTimeout(() => URL.revokeObjectURL(url), 1000);
				setMessage(`Converted ${pdf.pageCount} page${pdf.pageCount === 1 ? '' : 's'} to ${format.toUpperCase()} in a ZIP file.`);
			} finally {
				pdf.destroy();
			}
		} catch (error) {
			setMessage(error instanceof Error ? `Could not convert this PDF. ${error.message}` : 'Could not convert this PDF. It may be damaged or protected.');
		} finally {
			setBusy(false);
		}
	};

	return (
		<div>
			<div className="tool-control">
				<label htmlFor="pdf-image-file">PDF file</label>
				<input className="image-file-input" id="pdf-image-file" type="file" accept="application/pdf,.pdf" onChange={(event) => { setFile(event.target.files?.[0] ?? null); setMessage('PDF selected. Choose the output format and scale.'); }} onInput={(event) => { setFile((event.currentTarget as HTMLInputElement).files?.[0] ?? null); setMessage('PDF selected. Choose the output format and scale.'); }} />
			</div>
			<div className="calc-fields">
				<div className="calc-field"><label htmlFor="pdf-image-format">Output format</label><select id="pdf-image-format" value={format} onChange={(event) => setFormat(event.target.value as 'png' | 'jpeg')}><option value="png">PNG</option><option value="jpeg">JPG</option></select></div>
				<div className="calc-field"><label htmlFor="pdf-image-scale">Render scale</label><select id="pdf-image-scale" value={scale} onChange={(event) => setScale(Number(event.target.value))}><option value="1">1×</option><option value="2">2×</option><option value="3">3×</option></select></div>
			</div>
			<div className="tool-actions"><button className="tool-button" type="button" disabled={!file || busy} onClick={() => void convert()}>{busy ? 'Converting PDF…' : 'Convert pages to ZIP'}</button></div>
			<p className="tool-message" role="status">{message}</p>
			<p className="privacy-note">Rendering and ZIP creation run locally in this browser. Password-protected PDFs are not supported.</p>
		</div>
	);
}
