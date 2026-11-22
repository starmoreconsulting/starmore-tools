import { useState } from 'react';
import { formatHashBytes, HASH_ALGORITHMS, hashText, hashBytes, type HashAlgorithm } from '../../engines/hash';

const MAX_FILE_BYTES = 25 * 1024 * 1024;

export default function HashGenerator() {
	const [text, setText] = useState('');
	const [file, setFile] = useState<File | null>(null);
	const [algorithm, setAlgorithm] = useState<HashAlgorithm>('SHA-256');
	const [uppercase, setUppercase] = useState(false);
	const [hashes, setHashes] = useState<Record<HashAlgorithm, string>>({ 'SHA-1': '', 'SHA-256': '', 'SHA-384': '', 'SHA-512': '' });
	const [busy, setBusy] = useState(false);
	const [message, setMessage] = useState('Enter text or choose a file to generate hashes.');
	const [isError, setIsError] = useState(false);

	const formatHash = (value: string) => uppercase ? value.toUpperCase() : value;

	const updateSource = (value: string) => {
		setText(value);
		setFile(null);
		setHashes({ 'SHA-1': '', 'SHA-256': '', 'SHA-384': '', 'SHA-512': '' });
		setMessage('Enter text or choose a file to generate hashes.');
		setIsError(false);
	};

	const loadFile = (selected?: File) => {
		if (!selected) return;
		if (selected.size > MAX_FILE_BYTES) {
			setFile(null);
			setIsError(true);
			setMessage('Choose a file smaller than 25 MB.');
			return;
		}
		setText('');
		setFile(selected);
		setHashes({ 'SHA-1': '', 'SHA-256': '', 'SHA-384': '', 'SHA-512': '' });
		setMessage(`Selected ${selected.name} (${formatHashBytes(selected.size)}).`);
		setIsError(false);
	};

	const generate = async () => {
		if (!text && !file) return;
		setBusy(true);
		setIsError(false);
		try {
			const algorithms = HASH_ALGORITHMS.filter((item) => item === algorithm);
			const next: Record<HashAlgorithm, string> = { 'SHA-1': '', 'SHA-256': '', 'SHA-384': '', 'SHA-512': '' };
			for (const item of algorithms) {
				next[item] = file
					? await hashBytes(await file.arrayBuffer(), item)
					: await hashText(text, item);
			}
			setHashes(next);
			setMessage(`${algorithm} hash generated locally.`);
		} catch (error) {
			setHashes({ 'SHA-1': '', 'SHA-256': '', 'SHA-384': '', 'SHA-512': '' });
			setMessage(error instanceof Error ? error.message : 'Could not generate a hash.');
			setIsError(true);
		} finally {
			setBusy(false);
		}
	};

	const copy = async () => {
		const value = hashes[algorithm];
		if (!value) return;
		try {
			await navigator.clipboard.writeText(formatHash(value));
			setMessage('Hash copied to clipboard.');
			setIsError(false);
		} catch {
			setMessage('Could not access the clipboard. Select and copy the hash instead.');
			setIsError(true);
		}
	};

	const clear = () => {
		setText('');
		setFile(null);
		setHashes({ 'SHA-1': '', 'SHA-256': '', 'SHA-384': '', 'SHA-512': '' });
		setMessage('Enter text or choose a file to generate hashes.');
		setIsError(false);
	};

	return (
		<div>
			<div className="json-columns">
				<div>
					<label htmlFor="hash-text">Text to hash</label>
					<textarea
						id="hash-text"
						value={text}
						onChange={(event) => updateSource(event.target.value)}
						placeholder="Enter UTF-8 text"
						spellCheck={false}
					/>
				</div>
				<div>
					<label htmlFor="hash-file">Or choose a file (maximum 25 MB)</label>
					<input
						id="hash-file"
						type="file"
						onChange={(event) => {
							const selected = event.currentTarget.files?.[0];
							event.currentTarget.value = '';
							loadFile(selected);
						}}
					/>
					{file && <p className="html-formatter-note">Selected: {file.name} · {formatHashBytes(file.size)}</p>}
				</div>
			</div>
			<div className="json-columns">
				<div className="calc-field">
					<label htmlFor="hash-algorithm">Algorithm</label>
					<select id="hash-algorithm" value={algorithm} onChange={(event) => setAlgorithm(event.target.value as HashAlgorithm)}>
						{HASH_ALGORITHMS.map((item) => <option key={item} value={item}>{item}</option>)}
					</select>
				</div>
				<div className="calc-field">
					<label htmlFor="hash-uppercase">Output</label>
					<select id="hash-uppercase" value={uppercase ? 'uppercase' : 'lowercase'} onChange={(event) => setUppercase(event.target.value === 'uppercase')}>
						<option value="lowercase">Lowercase hexadecimal</option>
						<option value="uppercase">Uppercase hexadecimal</option>
					</select>
				</div>
			</div>
			<div className="tool-actions">
				<button className="tool-button" type="button" onClick={generate} disabled={busy || (!text && !file)}>Generate hash</button>
				<button className="tool-button secondary" type="button" onClick={copy} disabled={!hashes[algorithm]}>Copy hash</button>
				<button className="tool-button secondary" type="button" onClick={clear} disabled={!text && !file && !hashes[algorithm]}>Clear</button>
			</div>
			<div className="calc-field" style={{ marginTop: 16 }}>
				<label htmlFor="hash-output">{algorithm} result</label>
				<pre className="json-output" id="hash-output" aria-live="polite">{hashes[algorithm] ? formatHash(hashes[algorithm]) : 'Your hash will appear here.'}</pre>
			</div>
			<p className={`tool-message${isError ? ' error' : ''}`} role="status">{message}</p>
			<p className="html-formatter-note">Text is hashed as UTF-8. Files are read locally without uploading. This tool provides SHA-1, SHA-256, SHA-384, and SHA-512 through the browser Web Crypto API; SHA-1 is included for compatibility, not password security or collision resistance.</p>
		</div>
	);
}
