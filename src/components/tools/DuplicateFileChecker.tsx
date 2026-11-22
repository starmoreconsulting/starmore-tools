import { useState } from 'react';
import {
	DUPLICATE_CHECKER_MAX_FILE_BYTES,
	DUPLICATE_CHECKER_MAX_FILES,
	DUPLICATE_CHECKER_MAX_TOTAL_BYTES,
	findDuplicateFiles,
	type DuplicateFileGroup,
} from '../../engines/duplicate-files';

function formatBytes(bytes: number): string {
	if (bytes < 1000) return `${bytes} B`;
	if (bytes < 1_000_000) return `${(bytes / 1000).toFixed(1)} KB`;
	return `${(bytes / 1_000_000).toFixed(2)} MB`;
}

export default function DuplicateFileChecker() {
	const [files, setFiles] = useState<File[]>([]);
	const [groups, setGroups] = useState<DuplicateFileGroup[]>([]);
	const [busy, setBusy] = useState(false);
	const [progress, setProgress] = useState('');
	const [message, setMessage] = useState('Choose files to compare their contents locally.');
	const [isError, setIsError] = useState(false);
	const totalBytes = files.reduce((total, file) => total + file.size, 0);

	const scan = async () => {
		setBusy(true);
		setGroups([]);
		setProgress('');
		setMessage('Comparing file sizes and calculating SHA-256 fingerprints…');
		setIsError(false);
		try {
			const result = await findDuplicateFiles(files, (completed, total) => {
				setProgress(`Fingerprinting ${completed} of ${total} same-size candidate files…`);
			});
			setGroups(result.groups);
			setMessage(result.groups.length
				? `Found ${result.groups.length} group${result.groups.length === 1 ? '' : 's'} of identical files.`
				: `No identical files found among ${result.checkedFiles} selected files.`);
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Could not compare these files.');
			setIsError(true);
		} finally {
			setBusy(false);
			setProgress('');
		}
	};

	const removeFile = (removeIndex: number) => {
		setFiles((current) => current.filter((_, index) => index !== removeIndex));
		setGroups([]);
		setMessage('File list changed. Scan again to check for duplicates.');
		setIsError(false);
	};

	return (
		<div>
			<div className="calc-field">
				<label htmlFor="duplicate-checker-files">Files to compare (up to {DUPLICATE_CHECKER_MAX_FILES})</label>
				<input
					id="duplicate-checker-files"
					type="file"
					multiple
					onChange={(event) => {
						const selected = Array.from(event.currentTarget.files ?? []);
						setFiles((current) => [...current, ...selected]);
						setGroups([]);
						setMessage(`${files.length + selected.length} file${files.length + selected.length === 1 ? '' : 's'} selected. Scan to compare their contents.`);
						setIsError(false);
						event.currentTarget.value = '';
					}}
					disabled={busy}
				/>
			</div>
			{files.length > 0 && (
				<>
					<p className="tool-message">
						{files.length} / {DUPLICATE_CHECKER_MAX_FILES} files · {formatBytes(totalBytes)} / {formatBytes(DUPLICATE_CHECKER_MAX_TOTAL_BYTES)} total · {formatBytes(DUPLICATE_CHECKER_MAX_FILE_BYTES)} max each
					</p>
					<ul className="zip-file-list" aria-label="Files to compare">
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
				<button className="tool-button" type="button" onClick={() => void scan()} disabled={files.length < 2 || busy}>
					{busy ? 'Checking files…' : 'Find duplicate files'}
				</button>
				<button className="tool-button secondary" type="button" onClick={() => { setFiles([]); setGroups([]); setMessage('Choose files to compare their contents locally.'); setIsError(false); }} disabled={files.length === 0 || busy}>
					Clear files
				</button>
			</div>
			{progress && <p className="tool-message" aria-live="polite">{progress}</p>}
			{groups.map((group, groupIndex) => (
				<section className="duplicate-file-group" key={group.hash} aria-label={`Duplicate group ${groupIndex + 1}`}>
					<h2>Duplicate group {groupIndex + 1} <span>({group.files.length} files · {formatBytes(group.size)} each)</span></h2>
					<ul>{group.files.map((file) => <li key={`${file.index}-${file.name}`}>{file.name}</li>)}</ul>
				</section>
			))}
			<p className={`tool-message${isError ? ' error' : ''}`} role="status">{message}</p>
			<p className="tool-message">Files with different names can still be duplicates. Only same-size candidates need SHA-256 comparison. Files are read locally and never uploaded; this tool does not delete or modify them.</p>
		</div>
	);
}
