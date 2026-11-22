import { useState } from 'react';
import {
	formatFileSize,
	formatModifiedDate,
	getFileMetadata,
	METADATA_VIEWER_MAX_IMAGE_BYTES,
	type FileMetadata,
} from '../../engines/file-metadata';

interface ImageDimensions {
	width: number;
	height: number;
}

interface MetadataRecord {
	metadata: FileMetadata;
	dimensions: ImageDimensions | null;
	dimensionMessage: string;
}

export default function MetadataViewer() {
	const [record, setRecord] = useState<MetadataRecord | null>(null);
	const [message, setMessage] = useState('Choose a file to inspect its basic properties locally.');
	const [isError, setIsError] = useState(false);
	const [busy, setBusy] = useState(false);

	const inspectFile = async (file?: File) => {
		if (!file) return;
		const metadata = getFileMetadata(file);
		setRecord({ metadata, dimensions: null, dimensionMessage: '' });
		setMessage(`Read basic metadata for ${file.name}.`);
		setIsError(false);
		if (!metadata.imageLike) return;
		if (file.size > METADATA_VIEWER_MAX_IMAGE_BYTES) {
			setRecord({
				metadata,
				dimensions: null,
				dimensionMessage: 'Image dimensions not read because this image exceeds the 50 MB inspection limit.',
			});
			return;
		}
		if (typeof createImageBitmap !== 'function') {
			setRecord({
				metadata,
				dimensions: null,
				dimensionMessage: 'Image dimensions are unavailable in this browser.',
			});
			return;
		}

		setBusy(true);
		try {
			const bitmap = await createImageBitmap(file);
			let dimensions: ImageDimensions;
			try {
				dimensions = { width: bitmap.width, height: bitmap.height };
			} finally {
				bitmap.close();
			}
			setRecord({ metadata, dimensions, dimensionMessage: '' });
			setMessage(`Read basic metadata and image dimensions for ${file.name}.`);
		} catch (error) {
			setRecord({
				metadata,
				dimensions: null,
				dimensionMessage: error instanceof Error ? `Image dimensions could not be read: ${error.message}` : 'Image dimensions could not be read; the file may be damaged or unsupported.',
			});
			setMessage(`Basic metadata is available for ${file.name}, but its image dimensions could not be read.`);
			setIsError(true);
		} finally {
			setBusy(false);
		}
	};

	const clear = () => {
		setRecord(null);
		setMessage('Choose a file to inspect its basic properties locally.');
		setIsError(false);
	};

	return (
		<div>
			<div className="calc-field">
				<label htmlFor="metadata-viewer-file">File to inspect</label>
				<input
					id="metadata-viewer-file"
					type="file"
					onChange={(event) => void inspectFile(event.currentTarget.files?.[0])}
					disabled={busy}
				/>
			</div>
			{record && (
				<>
					<dl className="metadata-list">
						<div><dt>File name</dt><dd>{record.metadata.name}</dd></div>
						<div><dt>Extension</dt><dd>{record.metadata.extension}</dd></div>
						<div><dt>Category from extension/MIME</dt><dd>{record.metadata.fileCategory}</dd></div>
						<div><dt>Browser-declared MIME type</dt><dd>{record.metadata.declaredMimeType}</dd></div>
						<div><dt>File size</dt><dd>{formatFileSize(record.metadata.sizeBytes, 'bytes')}</dd></div>
						<div><dt>Decimal size</dt><dd>{formatFileSize(record.metadata.sizeBytes, 'kb')}</dd></div>
						<div><dt>Binary size</dt><dd>{formatFileSize(record.metadata.sizeBytes, 'kib')}</dd></div>
						<div><dt>Last modified</dt><dd>{formatModifiedDate(record.metadata.lastModified)}</dd></div>
						{record.metadata.imageLike && (
							<div>
								<dt>Image dimensions</dt>
								<dd>{record.dimensions ? `${record.dimensions.width.toLocaleString()} × ${record.dimensions.height.toLocaleString()} px` : record.dimensionMessage || (busy ? 'Reading image dimensions…' : 'Unavailable')}</dd>
							</div>
						)}
					</dl>
					<div className="tool-actions">
						<button className="tool-button secondary" type="button" onClick={clear} disabled={busy}>Clear</button>
					</div>
				</>
			)}
			<p className={`tool-message${isError ? ' error' : ''}`} role="status">{message}</p>
			<p className="tool-message">The browser exposes file name, declared type, size and last-modified time. This tool does not verify the actual file format, read EXIF metadata, or upload the file. Some metadata such as original creation time may not be available.</p>
		</div>
	);
}
