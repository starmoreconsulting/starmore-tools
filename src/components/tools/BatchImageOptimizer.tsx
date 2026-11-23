import { useState } from 'react';
import { unzipSync } from 'fflate';
import {
	createImageZip,
	createOutputFilename,
	isSupportedRasterImage,
	MAX_ARCHIVE_BYTES,
	MAX_BATCH_FILES,
	MAX_OUTPUT_BYTES,
	MAX_INPUT_FILE_BYTES,
	optimizeImageFile,
	type BatchImageFormat,
	type BatchImageOptions,
	type BatchImageOutput,
	validateBatchImageOptions,
} from '../../engines/batch-image-optimizer';
import { formatFileSize } from '../../engines/image';

type FileResult = {
	file: File;
	output?: BatchImageOutput;
	error?: string;
	status: 'ready' | 'processing' | 'done' | 'error';
};

function downloadBlob(blob: Blob, name: string) {
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = name;
	link.click();
	window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function BatchImageOptimizer() {
	const [files, setFiles] = useState<File[]>([]);
	const [results, setResults] = useState<FileResult[]>([]);
	const [maxWidth, setMaxWidth] = useState(1920);
	const [maxHeight, setMaxHeight] = useState(1920);
	const [format, setFormat] = useState<BatchImageFormat>('image/webp');
	const [quality, setQuality] = useState(80);
	const [busy, setBusy] = useState(false);
	const [zip, setZip] = useState<Blob | null>(null);
	const [message, setMessage] = useState('Choose multiple raster images to optimize them locally in your browser.');

	const chooseFiles = (selected: File[]) => {
		const limitedFiles = selected.slice(0, MAX_BATCH_FILES);
		setFiles(limitedFiles);
		setResults([]);
		setZip(null);
		setMessage(selected.length > MAX_BATCH_FILES
			? `Selected the first ${MAX_BATCH_FILES} files. Run smaller batches to process the rest.`
			: `${limitedFiles.length} image${limitedFiles.length === 1 ? '' : 's'} selected.`);
	};

	const processFiles = async () => {
		if (!files.length) {
			setMessage('Choose at least one image before optimizing.');
			return;
		}
		const options: BatchImageOptions = { maxWidth, maxHeight, format, quality };
		const validationError = validateBatchImageOptions(options);
		if (validationError) {
			setMessage(validationError);
			return;
		}

		setBusy(true);
		setZip(null);
		setResults(files.map((file) => ({ file, status: 'ready' })));
		setMessage(`Optimizing ${files.length} image${files.length === 1 ? '' : 's'} one at a time…`);
		const outputs: BatchImageOutput[] = [];
		const usedNames = new Set<string>();
		let totalOutputBytes = 0;
		for (let index = 0; index < files.length; index += 1) {
			const file = files[index];
			setResults((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, status: 'processing' } : item));
			try {
				if (!isSupportedRasterImage(file)) {
					throw new Error('Unsupported file type. Choose a JPG, PNG, WebP, GIF, BMP, or AVIF image.');
				}
				if (file.size > MAX_INPUT_FILE_BYTES) {
					throw new Error('This file is larger than the 100 MB per-image limit.');
				}
				const blob = await optimizeImageFile(file, options);
				if (totalOutputBytes + blob.size > MAX_OUTPUT_BYTES) {
					throw new Error('The batch reached its 200 MB output limit. Download these results and run the remaining files separately.');
				}
				const output = { name: createOutputFilename(file.name, format, usedNames), blob };
				outputs.push(output);
				totalOutputBytes += blob.size;
				setResults((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, output, status: 'done' } : item));
			} catch (error) {
				const message = error instanceof Error ? error.message : 'Could not optimize this image.';
				setResults((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, error: message, status: 'error' } : item));
			}
		}

		let zipCreated = false;
		if (outputs.length && totalOutputBytes <= MAX_ARCHIVE_BYTES) {
			try {
				setZip(await createImageZip(outputs));
				zipCreated = true;
			} catch {
				// Individual downloads remain available if ZIP creation is not supported or runs out of browser memory.
			}
		}
		const failed = files.length - outputs.length;
		setMessage(`${outputs.length} of ${files.length} image${files.length === 1 ? '' : 's'} optimized${failed ? `; ${failed} failed` : ''}.${outputs.length && !zipCreated ? ' Download successful files individually; a ZIP was not created for this batch.' : ''}`);
		setBusy(false);
	};

	const changeOptions = (update: Partial<BatchImageOptions>) => {
		if (update.maxWidth !== undefined) setMaxWidth(update.maxWidth);
		if (update.maxHeight !== undefined) setMaxHeight(update.maxHeight);
		if (update.format !== undefined) setFormat(update.format);
		if (update.quality !== undefined) setQuality(update.quality);
		setResults([]);
		setZip(null);
	};

	const successfulOutputs = results.filter((result) => result.output);

	return (
		<div>
			<div className="tool-control">
				<label htmlFor="batch-image-files">Choose images (select multiple)</label>
				<input
					className="image-file-input"
					id="batch-image-files"
					type="file"
					multiple
					disabled={busy}
					accept="image/jpeg,image/png,image/webp,image/gif,image/bmp,image/avif,.jpg,.jpeg,.png,.webp,.gif,.bmp,.avif"
					onChange={(event) => chooseFiles(Array.from(event.currentTarget.files ?? []))}
				/>
				{files.length > 0 && <p className="inline-note">{files.length} selected · maximum {MAX_BATCH_FILES} per batch · processing is sequential</p>}
			</div>

			<div className="calc-fields" style={{ marginTop: 16 }}>
				<div className="calc-field">
					<label htmlFor="batch-image-width">Maximum width (px)</label>
					<input id="batch-image-width" type="number" min="1" max="20000" step="1" value={maxWidth} disabled={busy} onChange={(event) => changeOptions({ maxWidth: Number(event.target.value) })} />
				</div>
				<div className="calc-field">
					<label htmlFor="batch-image-height">Maximum height (px)</label>
					<input id="batch-image-height" type="number" min="1" max="20000" step="1" value={maxHeight} disabled={busy} onChange={(event) => changeOptions({ maxHeight: Number(event.target.value) })} />
				</div>
				<div className="calc-field">
					<label htmlFor="batch-image-format">Output format</label>
					<select id="batch-image-format" value={format} disabled={busy} onChange={(event) => changeOptions({ format: event.target.value as BatchImageFormat })}>
						<option value="image/webp">WebP</option>
						<option value="image/jpeg">JPG</option>
						<option value="image/png">PNG</option>
					</select>
				</div>
			</div>
			<div className="tool-control" style={{ marginTop: 14 }}>
				<label htmlFor="batch-image-quality">Quality: {quality}% (JPG / WebP)</label>
				<input id="batch-image-quality" type="range" min="10" max="100" step="1" value={quality} disabled={busy} onChange={(event) => changeOptions({ quality: Number(event.target.value) })} />
				<p className="inline-note">PNG uses lossless browser encoding. Images are never enlarged; outputs are limited to 40 megapixels each.</p>
			</div>

			<div className="tool-actions">
				<button className="tool-button" type="button" disabled={!files.length || busy} onClick={() => void processFiles()}>{busy ? 'Optimizing…' : 'Optimize images'}</button>
				{zip && <button className="tool-button secondary" type="button" onClick={() => downloadBlob(zip, 'starmore-optimized-images.zip')}>Download all as ZIP</button>}
			</div>
			<p className="tool-message" role="status" aria-live="polite">{message}</p>

			{results.length > 0 && (
				<div className="calc-result-grid" aria-label="Image optimization results">
					{results.map((result, index) => {
						return (
							<div className="calc-result" key={`${result.file.name}-${index}`}>
								<span className="calc-label">{result.status === 'done' ? 'OPTIMIZED' : result.status === 'error' ? 'ERROR' : result.status === 'processing' ? 'PROCESSING' : 'WAITING'}</span>
								<strong>{result.file.name}</strong>
								<span>{formatFileSize(result.file.size)}{result.output ? ` → ${formatFileSize(result.output.blob.size)}` : ''}</span>
								{result.error && <span role="alert">{result.error}</span>}
								{result.output && <button className="tool-button secondary" type="button" onClick={() => downloadBlob(result.output!.blob, result.output!.name)}>Download {result.output.name}</button>}
							</div>
						);
					})}
					{successfulOutputs.length > 0 && <p className="inline-note">Successful outputs are retained locally up to a combined 200 MB. ZIP download is limited to 64 MB; larger batches can be downloaded one file at a time.</p>}
				</div>
			)}
			<p className="privacy-note">Your images stay on your device. Each file is decoded, resized, and encoded one at a time in this browser. Animated images are flattened to a still image.</p>
		</div>
	);
}
