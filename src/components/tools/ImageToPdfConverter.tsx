import { useState } from 'react';
import { PDFDocument, degrees } from 'pdf-lib';
import { getSupportedImageType, loadImage, MAX_IMAGE_PIXELS } from '../../engines/image';
import { triggerDownload } from '../../engines/pdf';

type PageSize = 'a4' | 'letter' | 'fit';

const pageSizes: Record<Exclude<PageSize, 'fit'>, [number, number]> = {
	a4: [595.28, 841.89],
	letter: [612, 792],
};

function moveItem<T>(items: T[], index: number, direction: number): T[] {
	const destination = index + direction;
	if (destination < 0 || destination >= items.length) return items;
	const next = [...items];
	[next[index], next[destination]] = [next[destination], next[index]];
	return next;
}

async function imageBytes(file: File, type: 'image/jpeg' | 'image/png' | 'image/webp'): Promise<{ bytes: Uint8Array; png: boolean }> {
	if (type === 'image/jpeg' || type === 'image/png') {
		return { bytes: new Uint8Array(await file.arrayBuffer()), png: type === 'image/png' };
	}
	const image = await loadImage(file);
	if (image.naturalWidth * image.naturalHeight > MAX_IMAGE_PIXELS) throw new Error(`${file.name} is too large to process safely in the browser.`);
	const canvas = document.createElement('canvas');
	canvas.width = image.naturalWidth;
	canvas.height = image.naturalHeight;
	const context = canvas.getContext('2d');
	if (!context) throw new Error('Your browser could not prepare the image canvas.');
	context.drawImage(image, 0, 0);
	const blob = await new Promise<Blob>((resolve, reject) => {
		canvas.toBlob((result) => result ? resolve(result) : reject(new Error(`Could not decode ${file.name}.`)), 'image/png');
	});
	canvas.width = 0;
	canvas.height = 0;
	return { bytes: new Uint8Array(await blob.arrayBuffer()), png: true };
}

export default function ImageToPdfConverter() {
	const [files, setFiles] = useState<File[]>([]);
	const [pageSize, setPageSize] = useState<PageSize>('a4');
	const [message, setMessage] = useState('Choose JPG, PNG, or WebP images. Everything is processed locally on your device.');
	const [busy, setBusy] = useState(false);

	const addFiles = (selected: FileList | null) => {
		const incoming = Array.from(selected ?? []);
		const unsupported = incoming.find((file) => !getSupportedImageType(file));
		if (unsupported) {
			setMessage(`${unsupported.name} is not a supported JPG, PNG, or WebP image.`);
			return;
		}
		setFiles([...files, ...incoming]);
		setMessage(incoming.length ? `${incoming.length} image${incoming.length === 1 ? '' : 's'} added locally.` : 'Choose images to begin.');
	};

	const createPdf = async () => {
		if (!files.length) {
			setMessage('Choose at least one image before creating a PDF.');
			return;
		}
		setBusy(true);
		try {
			const pdf = await PDFDocument.create();
			for (const file of files) {
				const type = getSupportedImageType(file);
				if (!type) throw new Error(`${file.name} is not a supported JPG, PNG, or WebP image.`);
				const source = await imageBytes(file, type);
				const embedded = source.png ? await pdf.embedPng(source.bytes) : await pdf.embedJpg(source.bytes);
				let [pageWidth, pageHeight] = pageSize === 'fit'
					? [embedded.width * 0.75, embedded.height * 0.75]
					: pageSizes[pageSize];
				const maxPageSize = 14_400;
				const scalePage = Math.min(1, maxPageSize / pageWidth, maxPageSize / pageHeight);
				pageWidth *= scalePage;
				pageHeight *= scalePage;
				const margin = pageSize === 'fit' ? 0 : 24;
				const scale = Math.min((pageWidth - margin * 2) / embedded.width, (pageHeight - margin * 2) / embedded.height);
				const width = embedded.width * scale;
				const height = embedded.height * scale;
				const page = pdf.addPage([pageWidth, pageHeight]);
				page.drawImage(embedded, {
					x: (pageWidth - width) / 2,
					y: (pageHeight - height) / 2,
					width,
					height,
					rotate: degrees(0),
				});
			}
			const bytes = await pdf.save();
			triggerDownload(new Blob([bytes], { type: 'application/pdf' }), 'starmore-images.pdf');
			setMessage(`Created a ${files.length}-page PDF on your device.`);
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Could not create the PDF from these images.');
		} finally {
			setBusy(false);
		}
	};

	return (
		<div>
			<div className="tool-control">
				<label htmlFor="image-pdf-files">Images</label>
				<input className="image-file-input" id="image-pdf-files" type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" multiple onChange={(event) => addFiles(event.currentTarget.files)} />
			</div>
			<div className="calc-field" style={{ marginTop: 15 }}>
				<label htmlFor="image-pdf-size">Page size</label>
				<select id="image-pdf-size" value={pageSize} onChange={(event) => setPageSize(event.target.value as PageSize)}>
					<option value="a4">A4</option>
					<option value="letter">Letter</option>
					<option value="fit">Fit to image</option>
				</select>
			</div>
			<ul className="file-list">
				{files.map((file, index) => (
					<li className="file-list-item" key={`${file.name}-${file.lastModified}-${index}`}>
						<span className="file-list-name">{index + 1}. {file.name}</span>
						<button className="tool-button secondary" type="button" aria-label={`Move ${file.name} up`} disabled={index === 0 || busy} onClick={() => setFiles(moveItem(files, index, -1))}>↑</button>
						<button className="tool-button secondary" type="button" aria-label={`Move ${file.name} down`} disabled={index === files.length - 1 || busy} onClick={() => setFiles(moveItem(files, index, 1))}>↓</button>
						<button className="tool-button secondary" type="button" aria-label={`Remove ${file.name}`} disabled={busy} onClick={() => setFiles(files.filter((_, fileIndex) => fileIndex !== index))}>Remove</button>
					</li>
				))}
			</ul>
			<div className="tool-actions">
				<button className="tool-button" type="button" disabled={!files.length || busy} onClick={createPdf}>{busy ? 'Creating PDF…' : 'Create and download PDF'}</button>
			</div>
			<p className="tool-message" role="status">{message}</p>
			<p className="privacy-note">Your images never leave your device. Images are converted and assembled into a PDF entirely in this browser.</p>
		</div>
	);
}
