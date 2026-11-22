import { useState } from 'react';
import { triggerDownload } from '../../engines/pdf';
import {
	EXIF_TOOL_MAX_FILE_BYTES,
	readJpegExif,
	stripJpegExif,
	type ExifTag,
} from '../../engines/exif-tool';

function getErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : 'Could not process this JPEG image.';
}

function getOutputName(fileName: string): string {
	const baseName = fileName.replace(/\.(jpe?g)$/i, '');
	return `${baseName}-without-exif.jpg`;
}

export default function ExifViewerRemover() {
	const [fileName, setFileName] = useState('');
	const [imageBytes, setImageBytes] = useState<Uint8Array | null>(null);
	const [tags, setTags] = useState<ExifTag[]>([]);
	const [message, setMessage] = useState('Choose a JPEG/JPG image to inspect its EXIF tags.');
	const [isError, setIsError] = useState(false);
	const [busy, setBusy] = useState(false);

	const inspectFile = async (file?: File) => {
		if (!file) return;
		setFileName('');
		setImageBytes(null);
		setTags([]);
		setIsError(false);
		if (file.size > EXIF_TOOL_MAX_FILE_BYTES) {
			setMessage('This image exceeds the 50 MB limit. Choose a smaller JPEG/JPG file.');
			setIsError(true);
			return;
		}

		setBusy(true);
		setMessage('Reading JPEG and EXIF tags locally…');
		try {
			const bytes = new Uint8Array(await file.arrayBuffer());
			const exifTags = await readJpegExif(bytes);
			setFileName(file.name);
			setImageBytes(bytes);
			setTags(exifTags);
			setMessage(exifTags.length > 0
				? `Found ${exifTags.length} EXIF tag${exifTags.length === 1 ? '' : 's'} in ${file.name}.`
				: `No readable EXIF tags were found in ${file.name}.`);
		} catch (error) {
			setMessage(getErrorMessage(error));
			setIsError(true);
		} finally {
			setBusy(false);
		}
	};

	const removeExif = () => {
		if (!imageBytes || !fileName) return;
		setBusy(true);
		setIsError(false);
		try {
			const result = stripJpegExif(imageBytes);
			if (!result.removed) {
				setMessage('No EXIF metadata segment was found to remove. No file was downloaded.');
				return;
			}
			triggerDownload(new Blob([result.bytes], { type: 'image/jpeg' }), getOutputName(fileName));
			setMessage(`Removed EXIF metadata without recompressing the image. Downloaded ${getOutputName(fileName)}.`);
		} catch (error) {
			setMessage(getErrorMessage(error));
			setIsError(true);
		} finally {
			setBusy(false);
		}
	};

	const clear = () => {
		setFileName('');
		setImageBytes(null);
		setTags([]);
		setMessage('Choose a JPEG/JPG image to inspect its EXIF tags.');
		setIsError(false);
	};

	return (
		<div>
			<div className="calc-field">
				<label htmlFor="exif-viewer-file">JPEG/JPG image (maximum 50 MB)</label>
				<input
					id="exif-viewer-file"
					type="file"
					accept=".jpg,.jpeg,image/jpeg"
					onChange={(event) => {
						const file = event.currentTarget.files?.[0];
						event.currentTarget.value = '';
						void inspectFile(file);
					}}
					disabled={busy}
				/>
			</div>
			{fileName && (
				<>
					{tags.length > 0 ? (
						<dl className="metadata-list" aria-label="EXIF metadata">
							{tags.map((tag) => (
								<div key={tag.name}><dt>{tag.name}</dt><dd>{tag.value}</dd></div>
							))}
						</dl>
					) : (
						<p className="tool-message">No readable EXIF tags were found. You can still check for and remove an EXIF segment from the JPEG.</p>
					)}
					<div className="tool-actions">
						<button className="tool-button" type="button" onClick={removeExif} disabled={busy}>
							{busy ? 'Removing…' : 'Remove EXIF and download'}
						</button>
						<button className="tool-button secondary" type="button" onClick={clear} disabled={busy}>Clear</button>
					</div>
				</>
			)}
			<p className={`tool-message${isError ? ' error' : ''}`} role="status">{message}</p>
			<p className="tool-message">JPEG/JPG images up to 50 MB are processed in your browser and are not uploaded. Removal strips EXIF metadata segments without recompressing the image; other metadata such as XMP or ICC profiles may remain. This tool does not support PNG, WebP, HEIC, or other formats.</p>
		</div>
	);
}
