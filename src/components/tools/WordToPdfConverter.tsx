import { useState } from 'react';
import { jsPDF } from 'jspdf';
import { extractWordPdfBlocks } from '../../engines/word-to-pdf';
import { triggerDownload } from '../../engines/pdf';

export default function WordToPdfConverter() {
	const [file, setFile] = useState<File | null>(null);
	const [busy, setBusy] = useState(false);
	const [message, setMessage] = useState('Choose a DOCX file. Conversion runs locally in this browser.');

	const convert = async () => {
		if (!file) { setMessage('Choose a DOCX file before converting.'); return; }
		if (!/\.docx$/i.test(file.name)) { setMessage('Choose a valid .docx file.'); return; }
		setBusy(true);
		setMessage('Reading the DOCX document…');
		try {
			const mammothModule = await import('mammoth');
			const mammoth = ((mammothModule as unknown as { default?: typeof import('mammoth') }).default
				?? (mammothModule as unknown as typeof import('mammoth')));
			const result = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() }, {
				convertImage: mammoth.images.dataUri,
				ignoreEmptyParagraphs: true,
			});
			const blocks = extractWordPdfBlocks(result.value);
			const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
			const pageWidth = pdf.internal.pageSize.getWidth();
			const pageHeight = pdf.internal.pageSize.getHeight();
			const margin = 48;
			const contentWidth = pageWidth - margin * 2;
			let y = margin;

			const ensureSpace = (height: number) => {
				if (y + height > pageHeight - margin) {
					pdf.addPage();
					y = margin;
				}
			};

			for (const block of blocks) {
				if (block.type === 'page-break') {
					pdf.addPage();
					y = margin;
					continue;
				}
				if (block.type === 'heading') {
					const size = block.level <= 1 ? 20 : block.level === 2 ? 17 : 14;
					pdf.setFont('helvetica', 'bold');
					pdf.setFontSize(size);
					ensureSpace(size * 1.5);
					const lines = pdf.splitTextToSize(block.text, contentWidth) as string[];
					ensureSpace(lines.length * size * 1.25);
					pdf.text(lines, margin, y);
					y += lines.length * size * 1.25 + 8;
					continue;
				}
				if (block.type === 'paragraph') {
					pdf.setFont('helvetica', 'normal');
					pdf.setFontSize(11);
					const lines = pdf.splitTextToSize(block.text, contentWidth) as string[];
					ensureSpace(lines.length * 14);
					pdf.text(lines, margin, y);
					y += lines.length * 14 + 8;
					continue;
				}
				if (block.type === 'list-item') {
					pdf.setFont('helvetica', 'normal');
					pdf.setFontSize(11);
					const lines = pdf.splitTextToSize(`• ${block.text}`, contentWidth - 12) as string[];
					ensureSpace(lines.length * 14);
					pdf.text(lines, margin + 12, y);
					y += lines.length * 14 + 5;
					continue;
				}
				if (block.type === 'table-row') {
					pdf.setFont('helvetica', 'normal');
					pdf.setFontSize(9);
					const cellWidth = contentWidth / block.cells.length;
					ensureSpace(28);
					block.cells.forEach((cell, index) => {
						pdf.rect(margin + index * cellWidth, y - 10, cellWidth, 24);
						pdf.text(pdf.splitTextToSize(cell, cellWidth - 8) as string[], margin + index * cellWidth + 4, y + 4);
					});
					y += 28;
					continue;
				}
				if (block.type === 'image') {
					try {
						const format = /^data:image\/jpeg/i.test(block.src) ? 'JPEG' : /^data:image\/png/i.test(block.src) ? 'PNG' : null;
						if (format) {
							const estimatedHeight = 180;
							ensureSpace(estimatedHeight + 12);
							pdf.addImage(block.src, format, margin, y, contentWidth, estimatedHeight, undefined, 'FAST');
							y += estimatedHeight + 12;
					}
					} catch {
						// Images that cannot be embedded are omitted rather than blocking the PDF.
					}
				}
			}

			const outputName = file.name.replace(/\.docx$/i, '') + '.pdf';
			triggerDownload(pdf.output('blob'), outputName);
			setMessage(`Created ${outputName}. Review formatting and embedded images before publishing.`);
		} catch (error) {
			setMessage(error instanceof Error ? `Could not convert this DOCX. ${error.message}` : 'Could not convert this DOCX. The file may be damaged or protected.');
		} finally {
			setBusy(false);
		}
	};

	return (
		<div>
			<div className="tool-control">
				<label htmlFor="word-pdf-file">DOCX file</label>
				<input className="image-file-input" id="word-pdf-file" type="file" accept="application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx" onChange={(event) => { setFile(event.target.files?.[0] ?? null); setMessage(event.target.files?.[0] ? 'DOCX selected. Ready to convert.' : 'Choose a DOCX file.'); }} />
			</div>
			<div className="tool-actions">
				<button className="tool-button" type="button" disabled={!file || busy} onClick={() => void convert()}>{busy ? 'Converting DOCX…' : 'Convert to PDF'}</button>
			</div>
			<p className="tool-message" role="status">{message}</p>
			<p className="privacy-note">DOCX parsing and PDF generation run locally in this browser. Complex Word layouts may be simplified.</p>
		</div>
	);
}
