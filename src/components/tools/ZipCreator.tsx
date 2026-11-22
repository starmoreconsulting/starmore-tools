import { useState } from 'react';
import { createZipArchive, ZIP_CREATOR_MAX_FILES, ZIP_CREATOR_MAX_TOTAL_BYTES } from '../../engines/zip-creator';
import { triggerDownload } from '../../engines/pdf';

const MAX_FILE_COUNT = ZIP_CREATOR_MAX_FILES;

function formatBytes(bytes: number): string {
	if (bytes < 1000) return `${bytes} B`;
	if (bytes < 1_000_000) return `${(bytes / 1000).toFixed(1)} KB`;
	return `${(bytes / 1_000_000).toFixed(2)} MB`;
}

function archiveFilename(value: string): string {
	const safeName = value.trim().replace(/\.zip$/i, '').replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-').replace(/[. ]+$/g, '');
	return `${safeName || 'archive'}.zip`;
}

export default function ZipCreator() {
	const [files, setFiles] = useState<File[]>([]);
	const [archiveName, setArchiveName] = useState('archive');
	const [busy, setBusy] = useState(false);
	const [message, setMessage] = useState('Choose files to bundle into a ZIP archive. Files stay on this device.');
	const [isError, setIsError] = useState(false);
	const totalBytes = files.reduce((total, file) => total + file.size, 0);

	const addFiles = (selectedFiles: FileList | null) => {
		if (!selectedFiles?.length) return;
		const incoming = Array.from(selectedFiles);
		const combined = [...files, ...incoming];
		setFiles(combined);
		setMessage(`${combined.length} file${combined.length === 1 ? '' : 's'} selected (${formatBytes(combined.reduce((total, file) => total + file.size, 0))}).`);
		setIsError(false);
	};

	const createArchive = async () => {
		setBusy(true);
		setMessage('Creating ZIP archive…');
		setIsError(false);
		try {
			const archive = await createZipArchive(files);
			triggerDownload(new Blob([archive], { type: 'application/zip' }), archiveFilename(archiveName));
			setMessage(`Created ${archiveFilename(archiveName)} with ${files.length} file${files.length === 1 ? '' : 's'} (${formatBytes(totalBytes)} before compression).`);
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Could not create the ZIP archive.');
			setIsError(true);
		} finally {
			setBusy(false);
		}
	};

	const removeFile = (indexToRemove: number) => {
		const nextFiles = files.filter((_, index) => index !== indexToRemove);
		setFiles(nextFiles);
		setMessage(`${nextFiles.length} file${nextFiles.length === 1 ? '' : 's'} selected (${formatBytes(nextFiles.reduce((total, file) => total + file.size, 0))}).`);
		setIsError(false);
	};

	return (
		<div>
			<div className="calc-field">
				<label htmlFor="zip-creator-files">Files to include (up to {MAX_FILE_COUNT}, maximum 50 MB total)</label>
				<input
					id="zip-creator-files"
					type="file"
					multiple
					onChange={(event) => {
						addFiles(event.currentTarget.files);
						event.currentTarget.value = '';
					}}
					disabled={busy}
				/>
			</div>
			<div className="calc-field" style={{ marginTop: 16 }}>
				<label htmlFor="zip-creator-name">ZIP filename</label>
				<input id="zip-creator-name" value={archiveName} onChange={(event) => setArchiveName(event.target.value)} disabled={busy} />
			</div>
			{files.length > 0 && (
				<>
					<p className="tool-message" aria-live="polite">
						{files.length} / {MAX_FILE_COUNT} files · {formatBytes(totalBytes)} / {formatBytes(ZIP_CREATOR_MAX_TOTAL_BYTES)}
					</p>
					<ul className="zip-file-list" aria-label="Selected files">
						{files.map((file, index) => (
							<li key={`${file.name}-${file.size}-${file.lastModified}-${index}`}>
								<span>{file.name} <small>{formatBytes(file.size)}</small></span>
								<button className="tool-button secondary" type="button" onClick={() => removeFile(index)} disabled={busy} aria-label={`Remove ${file.name}`}>Remove</button>
							</li>
						))}
					</ul>
				</>
			)}
			<div className="tool-actions">
				<button className="tool-button" type="button" onClick={() => void createArchive()} disabled={files.length === 0 || busy}>
					{busy ? 'Creating ZIP…' : 'Create and download ZIP'}
				</button>
				<button className="tool-button secondary" type="button" onClick={() => { setFiles([]); setMessage('Choose files to bundle into a ZIP archive. Files stay on this device.'); setIsError(false); }} disabled={files.length === 0 || busy}>
					Clear files
				</button>
			</div>
			<p className={`tool-message${isError ? ' error' : ''}`} role="status">{message}</p>
			<p className="tool-message">Duplicate filenames are renamed rather than overwritten. ZIP creation is performed locally; files are not uploaded.</p>
		</div>
	);
}
