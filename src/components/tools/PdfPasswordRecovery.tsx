import { useState } from 'react';
import {
	generateRecoveryCandidates,
	MAX_PASSWORD_ATTEMPTS,
	MAX_REMEMBERED_PASSWORDS,
	recoverPdfWithCandidates,
} from '../../engines/pdf-password-recovery';

export default function PdfPasswordRecovery() {
	const [file, setFile] = useState<File | null>(null);
	const [password, setPassword] = useState('');
	const [rememberedPasswords, setRememberedPasswords] = useState<string[]>([]);
	const [includeVariants, setIncludeVariants] = useState(true);
	const [busy, setBusy] = useState(false);
	const [message, setMessage] = useState('');

	function addRememberedPassword() {
		if (!password || rememberedPasswords.length >= MAX_REMEMBERED_PASSWORDS) return;
		setRememberedPasswords((current) => [...current, password]);
		setPassword('');
		setMessage('');
	}

	async function recover() {
		if (!file || rememberedPasswords.length === 0) return;
		setBusy(true);
		try {
			const candidates = generateRecoveryCandidates(rememberedPasswords, includeVariants);
			const bytes = new Uint8Array(await file.arrayBuffer());
			const result = await recoverPdfWithCandidates(bytes, candidates, (current, total) => {
				setMessage(`Checking remembered passwords and selected variations: ${current} of ${total} attempts…`);
			});
			if (!result) {
				setMessage('None of those remembered passwords or selected variations unlocked the PDF. Check your password manager, backups, or ask the document creator for an authorized copy.');
				return;
			}
			const url = URL.createObjectURL(new Blob([result.decrypted], { type: 'application/pdf' }));
			const link = document.createElement('a');
			link.href = url;
			link.download = file.name.replace(/\.pdf$/i, '') + '-unlocked.pdf';
			link.click();
			URL.revokeObjectURL(url);
			setMessage(`Unlocked and downloaded. Detected encryption: ${result.algorithm}.`);
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Recovery failed. No file was downloaded.');
		} finally {
			setBusy(false);
		}
	}

	return (
		<div className="tool-form">
			<p role="status">Use only with PDFs you own or are authorized to access. Your PDF and remembered passwords stay in this browser and are not uploaded.</p>
			<div className="calc-field">
				<label htmlFor="pdf-recovery-file">Encrypted PDF</label>
				<input id="pdf-recovery-file" type="file" accept="application/pdf,.pdf" onChange={(event) => {
					setFile(event.target.files?.[0] ?? null);
					setMessage('');
				}} />
			</div>
			<div className="calc-field">
				<label htmlFor="pdf-recovery-password">A password or clue you personally remember</label>
				<input
					id="pdf-recovery-password"
					type="password"
					autoComplete="off"
					spellCheck={false}
					maxLength={256}
					value={password}
					onChange={(event) => setPassword(event.target.value)}
					onKeyDown={(event) => {
						if (event.key === 'Enter') {
							event.preventDefault();
							addRememberedPassword();
						}
					}}
				/>
				<div className="tool-actions">
					<button className="tool-button" type="button" onClick={addRememberedPassword} disabled={!password || rememberedPasswords.length >= MAX_REMEMBERED_PASSWORDS}>Add remembered entry</button>
				</div>
				<p>{rememberedPasswords.length} of {MAX_REMEMBERED_PASSWORDS} remembered entries added. Entries are tried in the order added.</p>
			</div>
			<label>
				<input type="checkbox" checked={includeVariants} onChange={(event) => setIncludeVariants(event.target.checked)} />
				Try simple case and spacing variations of those entries (no number or word guessing)
			</label>
			<p>At most {MAX_PASSWORD_ATTEMPTS} attempts per run. Exact entries are tried before variations. Add only passwords, names, or phrases that you personally remember; do not paste downloaded wordlists.</p>
			<div className="tool-actions">
				<button className="tool-button" type="button" onClick={recover} disabled={!file || rememberedPasswords.length === 0 || busy}>{busy ? 'Checking…' : 'Try remembered passwords'}</button>
				{rememberedPasswords.length > 0 && <button className="tool-button secondary" type="button" onClick={() => {
				setRememberedPasswords([]);
				setMessage('');
				}} disabled={busy}>Clear remembered entries</button>}
			</div>
			{message && <p role="status">{message}</p>}
			<p>If these checks do not work, check your password manager, backups, or contact the document creator to request access.</p>
		</div>
	);
}
