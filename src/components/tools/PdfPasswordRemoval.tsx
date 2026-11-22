import { useState } from 'react';
import { triggerDownload } from '../../engines/pdf';
import { validateRemovalPassword } from '../../engines/pdf-password-removal';

export default function PdfPasswordRemoval() {
	const [file, setFile] = useState<File | null>(null);
	const [password, setPassword] = useState('');
	const [busy, setBusy] = useState(false);
	const [message, setMessage] = useState('Choose an encrypted PDF you are authorised to unlock.');

	const removePassword = async () => {
		if (!file) { setMessage('Choose an encrypted PDF before continuing.'); return; }
		let validated: string;
		try { validated = validateRemovalPassword(password); } catch (error) { setMessage(error instanceof Error ? error.message : 'Enter the PDF password.'); return; }
		setBusy(true);
		setMessage('Checking PDF encryption…');
		try {
			const { decryptPDF, isEncrypted } = await import('@pdfsmaller/pdf-decrypt');
			const bytes = new Uint8Array(await file.arrayBuffer());
			const info = await isEncrypted(bytes);
			if (!info.encrypted) throw new Error('This PDF is not encrypted.');
			setMessage(`Decrypting ${info.algorithm ?? 'the PDF'} locally…`);
			const decrypted = await decryptPDF(bytes, validated);
			triggerDownload(new Blob([decrypted], { type: 'application/pdf' }), file.name.replace(/\.pdf$/i, '') + '-decrypted.pdf');
			setMessage(`Removed password protection. Downloaded a decrypted copy of ${file.name}.`);
		} catch (error) {
			const detail = error instanceof Error ? error.message : 'Could not remove password protection.';
			setMessage(detail === 'Incorrect password' ? 'Incorrect password. Use the user or owner password you are authorised to access.' : `Could not remove password protection. ${detail}`);
		} finally {
			setBusy(false);
		}
	};

	return (
		<div>
			<div className="tool-control"><label htmlFor="pdf-remove-file">Encrypted PDF file</label><input className="image-file-input" id="pdf-remove-file" type="file" accept="application/pdf,.pdf" onChange={(event) => { setFile(event.target.files?.[0] ?? null); setMessage(event.target.files?.[0] ? 'Encrypted PDF selected. Enter an authorized password.' : 'Choose an encrypted PDF file.'); }} /></div>
			<div className="calc-field"><label htmlFor="pdf-remove-password">User or owner password</label><input id="pdf-remove-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter the authorized password" /></div>
			<div className="tool-actions"><button className="tool-button" type="button" disabled={!file || !password || busy} onClick={() => void removePassword()}>{busy ? 'Removing protection…' : 'Remove password and download PDF'}</button></div>
			<p className="tool-message" role="status">{message}</p>
			<p className="privacy-note">Use this tool only for PDFs you own or are authorized to unlock. Decryption happens locally in this browser; no password or file is sent to a server.</p>
		</div>
	);
}
