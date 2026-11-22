import { useState } from 'react';
import { triggerDownload } from '../../engines/pdf';
import { validatePdfPassword, type PdfEncryptionAlgorithm } from '../../engines/pdf-password';

export default function PdfPasswordProtection() {
	const [file, setFile] = useState<File | null>(null);
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [ownerPassword, setOwnerPassword] = useState('');
	const [algorithm, setAlgorithm] = useState<PdfEncryptionAlgorithm>('AES-256');
	const [allowPrinting, setAllowPrinting] = useState(true);
	const [allowModifying, setAllowModifying] = useState(false);
	const [allowCopying, setAllowCopying] = useState(false);
	const [allowAnnotating, setAllowAnnotating] = useState(false);
	const [allowFillingForms, setAllowFillingForms] = useState(false);
	const [allowExtraction, setAllowExtraction] = useState(false);
	const [allowAssembly, setAllowAssembly] = useState(false);
	const [allowHighQualityPrint, setAllowHighQualityPrint] = useState(false);
	const [busy, setBusy] = useState(false);
	const [message, setMessage] = useState('Choose a PDF and set a password. Encryption happens locally.');

	const protect = async () => {
		if (!file) { setMessage('Choose a PDF before protecting it.'); return; }
		let validated: string;
		try { validated = validatePdfPassword(password, confirmPassword); } catch (error) { setMessage(error instanceof Error ? error.message : 'Invalid password.'); return; }
		setBusy(true);
		setMessage(`Encrypting with ${algorithm}…`);
		try {
			const { encryptPDF } = await import('@pdfsmaller/pdf-encrypt');
			const bytes = new Uint8Array(await file.arrayBuffer());
			const encrypted = await encryptPDF(bytes, validated, {
				ownerPassword: ownerPassword.trim() || undefined,
				algorithm,
				allowPrinting,
				allowModifying,
				allowCopying,
				allowAnnotating,
				allowFillingForms,
				allowExtraction,
				allowAssembly,
				allowHighQualityPrint,
			});
			triggerDownload(new Blob([encrypted], { type: 'application/pdf' }), file.name.replace(/\.pdf$/i, '') + '-protected.pdf');
			setMessage(`Protected the PDF with ${algorithm} encryption. Keep the password safe; it cannot be recovered by this tool.`);
		} catch (error) {
			const detail = error instanceof Error ? error.message : 'The PDF may be damaged or already encrypted.';
			setMessage(`Could not protect this PDF. ${detail}`);
		} finally {
			setBusy(false);
		}
	};

	return (
		<div>
			<div className="tool-control"><label htmlFor="pdf-protect-file">PDF file</label><input className="image-file-input" id="pdf-protect-file" type="file" accept="application/pdf,.pdf" onChange={(event) => { setFile(event.target.files?.[0] ?? null); setMessage(event.target.files?.[0] ? 'PDF selected. Set a password and permissions.' : 'Choose a PDF file.'); }} /></div>
			<div className="calc-fields">
				<div className="calc-field"><label htmlFor="pdf-protect-password">Password</label><input id="pdf-protect-password" type="password" minLength={6} maxLength={127} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters" /></div>
				<div className="calc-field"><label htmlFor="pdf-protect-confirm">Confirm password</label><input id="pdf-protect-confirm" type="password" maxLength={127} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Repeat the password" /></div>
				<div className="calc-field"><label htmlFor="pdf-protect-owner">Owner password (optional)</label><input id="pdf-protect-owner" type="password" value={ownerPassword} onChange={(event) => setOwnerPassword(event.target.value)} placeholder="For managing permissions" /></div>
				<div className="calc-field"><label htmlFor="pdf-protect-algorithm">Encryption</label><select id="pdf-protect-algorithm" value={algorithm} onChange={(event) => setAlgorithm(event.target.value as PdfEncryptionAlgorithm)}><option value="AES-256">AES-256 (recommended)</option><option value="RC4">RC4 (legacy compatibility)</option></select></div>
			</div>
			<fieldset className="duplicate-options"><legend>Reader permissions</legend>
				<label className="duplicate-option"><input type="checkbox" checked={allowPrinting} onChange={(event) => setAllowPrinting(event.target.checked)} /><span>Allow printing</span></label>
				<label className="duplicate-option"><input type="checkbox" checked={allowModifying} onChange={(event) => setAllowModifying(event.target.checked)} /><span>Allow modifying</span></label>
				<label className="duplicate-option"><input type="checkbox" checked={allowCopying} onChange={(event) => setAllowCopying(event.target.checked)} /><span>Allow copying</span></label>
				<label className="duplicate-option"><input type="checkbox" checked={allowAnnotating} onChange={(event) => setAllowAnnotating(event.target.checked)} /><span>Allow annotations</span></label>
				<label className="duplicate-option"><input type="checkbox" checked={allowFillingForms} onChange={(event) => setAllowFillingForms(event.target.checked)} /><span>Allow form filling</span></label>
				<label className="duplicate-option"><input type="checkbox" checked={allowExtraction} onChange={(event) => setAllowExtraction(event.target.checked)} /><span>Allow accessibility extraction</span></label>
				<label className="duplicate-option"><input type="checkbox" checked={allowAssembly} onChange={(event) => setAllowAssembly(event.target.checked)} /><span>Allow document assembly</span></label>
				<label className="duplicate-option"><input type="checkbox" checked={allowHighQualityPrint} onChange={(event) => setAllowHighQualityPrint(event.target.checked)} /><span>Allow high-quality printing</span></label>
			</fieldset>
			<div className="tool-actions"><button className="tool-button" type="button" disabled={!file || busy} onClick={() => void protect()}>{busy ? 'Encrypting PDF…' : 'Protect PDF'}</button></div>
			<p className="tool-message" role="status">{message}</p>
			<p className="privacy-note">Encryption and permissions run locally in this browser. Passwords are not sent to a server. Permissions are advisory; a user password controls opening the document.</p>
		</div>
	);
}
