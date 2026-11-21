import { useState } from 'react';
import { generateEmailSignature, type EmailSignatureProfile } from '../../engines/email-signature';

export default function EmailSignatureDesigner() {
	const [profile, setProfile] = useState<EmailSignatureProfile>({ name: '', title: '', company: '', email: '', phone: '', website: '', colour: '#356b54' });
	const [message, setMessage] = useState('');
	const html = generateEmailSignature(profile);

	const update = (key: keyof EmailSignatureProfile, value: string) => setProfile((current) => ({ ...current, [key]: value }));
	const copy = async () => {
		try { await navigator.clipboard.writeText(html); setMessage('Email signature HTML copied to clipboard.'); }
		catch { setMessage('Could not access the clipboard. Select the HTML below instead.'); }
	};
	const download = () => {
		const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a'); link.href = url; link.download = 'email-signature.html'; link.click(); URL.revokeObjectURL(url);
		setMessage('Email signature HTML downloaded.');
	};

	return (
		<div>
			<div className="calc-fields">
				<div className="calc-field"><label htmlFor="signature-name">Name</label><input id="signature-name" value={profile.name} onChange={(event) => update('name', event.target.value)} onInput={(event) => update('name', event.currentTarget.value)} placeholder="Ada Lovelace" /></div>
				<div className="calc-field"><label htmlFor="signature-title">Job title</label><input id="signature-title" value={profile.title} onChange={(event) => update('title', event.target.value)} onInput={(event) => update('title', event.currentTarget.value)} placeholder="Product Designer" /></div>
				<div className="calc-field"><label htmlFor="signature-company">Company</label><input id="signature-company" value={profile.company} onChange={(event) => update('company', event.target.value)} onInput={(event) => update('company', event.currentTarget.value)} placeholder="Starmore Studio" /></div>
				<div className="calc-field"><label htmlFor="signature-email">Email</label><input id="signature-email" type="email" value={profile.email} onChange={(event) => update('email', event.target.value)} onInput={(event) => update('email', event.currentTarget.value)} placeholder="ada@example.com" /></div>
				<div className="calc-field"><label htmlFor="signature-phone">Phone</label><input id="signature-phone" value={profile.phone} onChange={(event) => update('phone', event.target.value)} onInput={(event) => update('phone', event.currentTarget.value)} placeholder="+234 800 000 0000" /></div>
				<div className="calc-field"><label htmlFor="signature-website">Website</label><input id="signature-website" value={profile.website} onChange={(event) => update('website', event.target.value)} onInput={(event) => update('website', event.currentTarget.value)} placeholder="example.com" /></div>
				<div className="calc-field"><label htmlFor="signature-colour">Accent colour</label><input id="signature-colour" type="color" value={profile.colour} onChange={(event) => update('colour', event.target.value)} onInput={(event) => update('colour', event.currentTarget.value)} /></div>
			</div>
			<label>Live preview</label>
			<iframe title="Email signature preview" className="signature-preview" srcDoc={`<!doctype html><html><body style="margin:24px">${html}</body></html>`} />
			<label htmlFor="signature-html">HTML for your email client</label>
			<textarea id="signature-html" value={html} readOnly />
			<div className="tool-actions"><button className="tool-button" type="button" onClick={() => void copy()}>Copy HTML</button><button className="tool-button secondary" type="button" onClick={download}>Download HTML</button></div>
			<p className="tool-message" role="status">{message || 'Paste the copied HTML into an email client that supports signature HTML.'}</p>
		</div>
	);
}
