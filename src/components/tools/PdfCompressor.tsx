import { useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import { formatFileSize } from '../../engines/image';

export default function PdfCompressor() {
	const [file, setFile] = useState<File | null>(null);
	const [quality, setQuality] = useState(75);
	const [busy, setBusy] = useState(false);
	const [message, setMessage] = useState('Choose a PDF to reduce structural overhead locally.');

	const compress = async () => {
		if (!file) { setMessage('Choose a PDF before compressing.'); return; }
		setBusy(true); setMessage('Rebuilding the PDF with compact object streams…');
		try {
			const source = await PDFDocument.load(await file.arrayBuffer(), { updateMetadata: false });
			const output = await PDFDocument.create();
			const pages = await output.copyPages(source, source.getPageIndices());
			for (const page of pages) output.addPage(page);
			output.setTitle(source.getTitle() ?? 'Compressed PDF');
			const result = await output.save({ useObjectStreams: true, addDefaultPage: false, objectsPerTick: 50 });
			const blob = new Blob([result as BlobPart], { type: 'application/pdf' });
			const url = URL.createObjectURL(blob); const link=document.createElement('a'); link.href=url; link.download=file.name.replace(/\.pdf$/i,'')+'-compressed.pdf'; link.click(); URL.revokeObjectURL(url);
			setMessage(`PDF rebuilt locally: ${formatFileSize(file.size)} → ${formatFileSize(blob.size)}. Quality setting ${quality}%; already compressed image streams may not shrink further.`);
		} catch (error) {
			setMessage(error instanceof Error ? `Could not compress this PDF. ${error.message}` : 'Could not compress this PDF. It may be damaged or protected.');
		} finally { setBusy(false); }
	};

	return (
		<div>
			<div className="tool-control"><label htmlFor="pdf-compress-file">PDF file</label><input id="pdf-compress-file" type="file" accept="application/pdf,.pdf" onChange={(event)=>setFile(event.target.files?.[0] ?? null)} onInput={(event)=>setFile((event.currentTarget as HTMLInputElement).files?.[0] ?? null)} /></div>
			<div className="calc-field"><label htmlFor="pdf-compress-quality">Compression preference</label><input id="pdf-compress-quality" type="range" min="20" max="100" value={quality} onChange={(event)=>setQuality(Number(event.target.value))} /><small>{quality}% preference</small></div>
			<div className="tool-actions"><button className="tool-button" type="button" onClick={()=>void compress()} disabled={!file || busy}>{busy?'Compressing…':'Compress PDF locally'}</button></div>
			<p className="tool-message" role="status">{message}</p>
		</div>
	);
}
