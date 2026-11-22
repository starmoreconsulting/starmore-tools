import { useState } from 'react';
import type { ZipEntry } from '../../engines/zip-extractor';
import { extractZipEntry, inspectZipArchive, safeExtractedFilename, ZIP_EXTRACTOR_MAX_ARCHIVE_BYTES, ZIP_EXTRACTOR_MAX_ENTRIES, ZIP_EXTRACTOR_MAX_ENTRY_BYTES } from '../../engines/zip-extractor';
import { triggerDownload } from '../../engines/pdf';

const MAX_ARCHIVE_BYTES = ZIP_EXTRACTOR_MAX_ARCHIVE_BYTES;

function formatBytes(bytes: number | null): string {
	if (bytes === null) return 'Size unknown';
	if (bytes < 1000) return `${bytes} B`;
	if (bytes < 1_000_000) return `${(bytes / 1000).toFixed(1)} KB`;
	return `${(bytes / 1_000_000).toFixed(2)} MB`;
}

function getErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : 'Could not read this ZIP archive.';
}

export default function ZipExtractor() {
	const [archive, setArchive] = useState<Uint8Array | null>(null);
	const [entries, setEntries] = useState<ZipEntry[]>([]);
	const [busyIndex, setBusyIndex] = useState<number | null>(null);
	const [message, setMessage] = useState('Choose a ZIP archive to browse its contents locally.');
	const [isError, setIsError] = useState(false);

	const loadArchive = async (file?: File) => {
		if (!file) return;
		setArchive(null);
		setEntries([]);
		setIsError(false);
		if (file.size > MAX_ARCHIVE_BYTES) {
			setMessage('ZIP archive is too large. Choose an archive no larger than 20 MB.');
			setIsError(true);
			return;
		}
		setMessage('Reading ZIP archive…');
		try {
			const bytes = new Uint8Array(await file.arrayBuffer());
			const archiveEntries = inspectZipArchive(bytes);
			setArchive(bytes);
			setEntries(archiveEntries);
			const knownBytes = archiveEntries.reduce((total, entry) => total + (entry.size ?? 0), 0);
			setMessage(`Found ${archiveEntries.length} file${archiveEntries.length === 1 ? '' : 's'} (${formatBytes(knownBytes)} known uncompressed data).`);
		} catch (error) {
			setMessage(getErrorMessage(error));
			setIsError(true);
		}
	};

	const extract = async (entry: ZipEntry) => {
		if (!archive) return;
		setBusyIndex(entry.index);
		setMessage(`Extracting ${safeExtractedFilename(entry.name)}…`);
		setIsError(false);
		try {
			const bytes = await extractZipEntry(archive, entry);
			const blob = new Blob([bytes], { type: 'application/octet-stream' });
			triggerDownload(blob, safeExtractedFilename(entry.name));
			setMessage(`Extracted ${safeExtractedFilename(entry.name)} (${formatBytes(bytes.length)}). It was downloaded to your device.`);
		} catch (error) {
			setMessage(getErrorMessage(error));
			setIsError(true);
		} finally {
			setBusyIndex(null);
		}
	};

	const totalKnownBytes = entries.reduce((total, entry) => total + (entry.size ?? 0), 0);

	return (
		<div>
			<div className="calc-field">
				<label htmlFor="zip-extractor-file">ZIP archive (maximum 20 MB)</label>
				<input
					id="zip-extractor-file"
					type="file"
					accept=".zip,application/zip,application/x-zip-compressed"
					onChange={(event) => void loadArchive(event.currentTarget.files?.[0])}
					disabled={busyIndex !== null}
				/>
			</div>
			{entries.length > 0 && (
				<>
					<p className="tool-message" aria-live="polite">
						{entries.length} / {ZIP_EXTRACTOR_MAX_ENTRIES} files · {formatBytes(totalKnownBytes)} known uncompressed · {formatBytes(ZIP_EXTRACTOR_MAX_ENTRY_BYTES)} maximum per file
					</p>
					<ul className="zip-file-list" aria-label="Files in ZIP archive">
						{entries.map((entry) => (
							<li key={`${entry.index}-${entry.name}`}>
								<span>
									{entry.name}
									<small>{formatBytes(entry.size)}{entry.compressedSize !== null ? ` · ${formatBytes(entry.compressedSize)} zipped` : ''}</small>
								</span>
								<button className="tool-button secondary" type="button" onClick={() => void extract(entry)} disabled={busyIndex !== null || (entry.size !== null && entry.size > ZIP_EXTRACTOR_MAX_ENTRY_BYTES)}>
									{busyIndex === entry.index ? 'Extracting…' : 'Extract'}
								</button>
							</li>
						))}
					</ul>
				</>
			)}
			<p className={`tool-message${isError ? ' error' : ''}`} role="status">{message}</p>
			<p className="tool-message">Archives are processed locally and files are downloaded one at a time; nothing is uploaded. Password-protected archives and uncommon compression methods may not be supported.</p>
		</div>
	);
}
