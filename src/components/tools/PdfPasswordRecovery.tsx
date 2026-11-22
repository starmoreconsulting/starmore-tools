import { useState } from 'react';
import { triggerDownload } from '../../engines/pdf';
import { normalizeRecoveryCandidates, recoverPdfPassword, type PdfCandidateMode } from '../../engines/pdf-password-recovery';

export default function PdfPasswordRecovery() {
	const [file, setFile] = useState<File | null>(null);
	const [dictionary, setDictionary] = useState('');
	const [clues, setClues] = useState('');
	const [mode, setMode] = useState<PdfCandidateMode>('dictionary');
	const [minimumLength, setMinimumLength] = useState(1);
	const [maximumLength, setMaximumLength] = useState(4);
	const [busy, setBusy] = useState(false);
	const [progress, setProgress] = useState('Choose a PDF you own or are authorised to recover, then enter passwords you remember.');

	const startRecovery = async () => {
		if (!file) { setProgress('Choose an encrypted PDF before continuing.'); return; }
		setBusy(true);
		try {
			const bytes = new Uint8Array(await file.arrayBuffer());
			const candidates = normalizeRecoveryCandidates(dictionary, {
				mode,
				clues: clues.split(/[,\n]/).map((value) => value.trim()).filter(Boolean),
				minimumLength: Math.max(1, Math.min(6, minimumLength)),
				maximumLength: Math.max(1, Math.min(6, maximumLength)),
				limit: mode === 'dictionary' ? 20000 : 25000,
			});
			if (!candidates.length) { setProgress('Enter passwords you remember or choose a bounded candidate mode.'); return; }
			setProgress(`Testing ${candidates.length.toLocaleString()} local candidates…`);
			const result = await recoverPdfPassword(bytes, candidates, (current, total) => {
				setProgress(`Testing candidate ${current.toLocaleString()} of ${total.toLocaleString()}…`);
			});
			if (!result) {
				setProgress(`No matching password was found among ${candidates.length.toLocaleString()} candidates. This does not prove that the password is unrecoverable.`);
				return;
			}
			triggerDownload(new Blob([result.decrypted], { type: 'application/pdf' }), file.name.replace(/\.pdf$/i, '') + '-recovered.pdf');
			setProgress(`Recovered with ${result.algorithm}. The password was: ${result.password}`);
		} catch (error) {
			setProgress(error instanceof Error ? error.message : 'Password recovery could not be completed.');
		} finally {
			setBusy(false);
		}
	};

	return (
		<div>
			<div className="tool-control"><label htmlFor="pdf-recovery-file">Encrypted PDF file</label><input className="image-file-input" id="pdf-recovery-file" type="file" accept="application/pdf,.pdf" onChange={(event) => { setFile(event.target.files?.[0] ?? null); setProgress(event.target.files?.[0] ? 'PDF selected. Configure authorized recovery candidates.' : 'Choose an encrypted PDF file.'); }} /></div>
			<div className="calc-field"><label htmlFor="pdf-recovery-mode">Candidate source</label><select id="pdf-recovery-mode" value={mode} onChange={(event) => setMode(event.target.value as PdfCandidateMode)}><option value="dictionary">Dictionary or pasted candidates</option><option value="digits">Generated numbers</option><option value="lowercase">Generated lowercase letters</option></select></div>
			{mode === 'dictionary' && 			<div className="calc-field"><label htmlFor="pdf-recovery-dictionary">Passwords you remember (one candidate per line)</label><textarea id="pdf-recovery-dictionary" value={dictionary} onChange={(event) => setDictionary(event.target.value)} rows={7} placeholder={'remembered phrase\nold project name\npossible password'} /><small>Enter exact candidates you recall, up to 20,000. Each line is tried as entered.</small></div>}
			<div className="calc-field"><label htmlFor="pdf-recovery-clues">Known words or clues (comma or newline separated)</label><textarea id="pdf-recovery-clues" value={clues} onChange={(event) => setClues(event.target.value)} rows={3} placeholder="company name, person name, project name" /></div>
			{mode !== 'dictionary' && <div className="calc-grid"><div className="calc-field"><label htmlFor="pdf-recovery-min">Minimum length</label><input id="pdf-recovery-min" type="number" min="1" max="6" value={minimumLength} onChange={(event) => setMinimumLength(Number(event.target.value) || 1)} /></div><div className="calc-field"><label htmlFor="pdf-recovery-max">Maximum length</label><input id="pdf-recovery-max" type="number" min="1" max="6" value={maximumLength} onChange={(event) => setMaximumLength(Number(event.target.value) || 1)} /></div></div>}
			<div className="tool-actions"><button className="tool-button" type="button" disabled={!file || busy} onClick={() => void startRecovery()}>{busy ? 'Recovering locally…' : 'Recover password and download PDF'}</button></div>
			<p className="tool-message" role="status">{progress}</p>
			<p className="privacy-note">Use only with PDFs you own or are authorized to recover. Candidate testing runs locally in this browser; no file or password is uploaded. This tool checks a bounded set of candidates, not every possible password, and cannot guarantee recovery.</p>
		</div>
	);
}
