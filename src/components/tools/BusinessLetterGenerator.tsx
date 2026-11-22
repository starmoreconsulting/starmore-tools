import { useState } from 'react';
import {
	BUSINESS_LETTER_MAX_BODY_LENGTH,
	BUSINESS_LETTER_MAX_DETAILS_LENGTH,
	BUSINESS_LETTER_MAX_NAME_LENGTH,
	createBusinessLetterPdf,
	type BusinessLetterInput,
} from '../../engines/business-letter';
import { triggerDownload } from '../../engines/pdf';

function localDateString(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

function initialLetter(): BusinessLetterInput {
	return {
		senderName: '',
		senderTitle: '',
		senderDetails: '',
		recipientName: '',
		recipientTitle: '',
		recipientOrganization: '',
		recipientDetails: '',
		date: localDateString(new Date()),
		subject: '',
		salutation: 'Dear Sir or Madam,',
		body: '',
		closing: 'Yours sincerely,',
		signatureName: '',
		signatureTitle: '',
	};
}

function safeFilename(value: string): string {
	const name = value.trim().replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 60);
	return `${name || 'business-letter'}.pdf`;
}

function formatDate(value: string): string {
	if (!value) return '—';
	const date = new Date(`${value}T00:00:00`);
	return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en', { dateStyle: 'long' }).format(date);
}

export default function BusinessLetterGenerator() {
	const [letter, setLetter] = useState(initialLetter);
	const [message, setMessage] = useState('Your letter is prepared locally in this browser.');
	const [busy, setBusy] = useState(false);

	const updateField = <K extends keyof BusinessLetterInput>(key: K, value: BusinessLetterInput[K]) => {
		setLetter((current) => ({ ...current, [key]: value }));
		setMessage('');
	};

	const downloadPdf = async () => {
		setBusy(true);
		setMessage('');
		try {
			const bytes = await createBusinessLetterPdf(letter);
			triggerDownload(new Blob([bytes], { type: 'application/pdf' }), safeFilename(letter.subject || 'business-letter'));
			setMessage('Business letter PDF downloaded.');
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Could not create the business letter PDF.');
		} finally {
			setBusy(false);
		}
	};

	return (
		<div>
			<div className="business-letter-columns">
				<div className="business-letter-form">
					<section className="business-letter-form-section">
						<h2>Sender details</h2>
						<div className="calc-fields">
							<div className="calc-field">
								<label htmlFor="letter-sender-name">Your name *</label>
								<input id="letter-sender-name" maxLength={BUSINESS_LETTER_MAX_NAME_LENGTH} required value={letter.senderName} onChange={(event) => updateField('senderName', event.target.value)} />
							</div>
							<div className="calc-field">
								<label htmlFor="letter-sender-title">Your role / title</label>
								<input id="letter-sender-title" maxLength={BUSINESS_LETTER_MAX_NAME_LENGTH} value={letter.senderTitle} onChange={(event) => updateField('senderTitle', event.target.value)} placeholder="Optional" />
							</div>
							<div className="calc-field business-letter-full-width">
								<label htmlFor="letter-sender-details">Address and contact details</label>
								<textarea id="letter-sender-details" maxLength={BUSINESS_LETTER_MAX_DETAILS_LENGTH} rows={3} value={letter.senderDetails} onChange={(event) => updateField('senderDetails', event.target.value)} placeholder="Address, email, phone" />
							</div>
						</div>
					</section>

					<section className="business-letter-form-section">
						<h2>Recipient and letter details</h2>
						<div className="calc-fields">
							<div className="calc-field">
								<label htmlFor="letter-recipient-name">Recipient name *</label>
								<input id="letter-recipient-name" maxLength={BUSINESS_LETTER_MAX_NAME_LENGTH} required value={letter.recipientName} onChange={(event) => updateField('recipientName', event.target.value)} />
							</div>
							<div className="calc-field">
								<label htmlFor="letter-recipient-title">Recipient role / title</label>
								<input id="letter-recipient-title" maxLength={BUSINESS_LETTER_MAX_NAME_LENGTH} value={letter.recipientTitle} onChange={(event) => updateField('recipientTitle', event.target.value)} placeholder="Optional" />
							</div>
							<div className="calc-field">
								<label htmlFor="letter-recipient-organization">Organization</label>
								<input id="letter-recipient-organization" maxLength={BUSINESS_LETTER_MAX_NAME_LENGTH} value={letter.recipientOrganization} onChange={(event) => updateField('recipientOrganization', event.target.value)} placeholder="Optional" />
							</div>
							<div className="calc-field">
								<label htmlFor="letter-date">Date</label>
								<input id="letter-date" type="date" value={letter.date} onChange={(event) => updateField('date', event.target.value)} />
							</div>
							<div className="calc-field business-letter-full-width">
								<label htmlFor="letter-recipient-details">Recipient address</label>
								<textarea id="letter-recipient-details" maxLength={BUSINESS_LETTER_MAX_DETAILS_LENGTH} rows={3} value={letter.recipientDetails} onChange={(event) => updateField('recipientDetails', event.target.value)} placeholder="Street address, city, postal code" />
							</div>
							<div className="calc-field business-letter-full-width">
								<label htmlFor="letter-subject">Subject (optional)</label>
								<input id="letter-subject" maxLength={BUSINESS_LETTER_MAX_NAME_LENGTH} value={letter.subject} onChange={(event) => updateField('subject', event.target.value)} placeholder="Briefly describe the purpose of this letter" />
							</div>
							<div className="calc-field">
								<label htmlFor="letter-salutation">Salutation</label>
								<input id="letter-salutation" maxLength={BUSINESS_LETTER_MAX_NAME_LENGTH} required value={letter.salutation} onChange={(event) => updateField('salutation', event.target.value)} />
							</div>
							<div className="calc-field">
								<label htmlFor="letter-closing">Closing</label>
								<input id="letter-closing" maxLength={BUSINESS_LETTER_MAX_NAME_LENGTH} required value={letter.closing} onChange={(event) => updateField('closing', event.target.value)} />
							</div>
						</div>
					</section>

					<section className="business-letter-form-section">
						<h2>Letter content</h2>
						<div className="calc-fields">
							<div className="calc-field business-letter-full-width">
								<label htmlFor="letter-body">Body *</label>
								<textarea id="letter-body" maxLength={BUSINESS_LETTER_MAX_BODY_LENGTH} rows={12} required value={letter.body} onChange={(event) => updateField('body', event.target.value)} placeholder="Write your letter here. Use a blank line to separate paragraphs." />
							</div>
							<div className="calc-field">
								<label htmlFor="letter-signature-name">Name for sign-off *</label>
								<input id="letter-signature-name" maxLength={BUSINESS_LETTER_MAX_NAME_LENGTH} required value={letter.signatureName} onChange={(event) => updateField('signatureName', event.target.value)} />
							</div>
							<div className="calc-field">
								<label htmlFor="letter-signature-title">Sign-off title</label>
								<input id="letter-signature-title" maxLength={BUSINESS_LETTER_MAX_NAME_LENGTH} value={letter.signatureTitle} onChange={(event) => updateField('signatureTitle', event.target.value)} placeholder="Optional" />
							</div>
						</div>
					</section>

					<div className="tool-actions">
						<button className="tool-button" type="button" disabled={busy} onClick={downloadPdf}>
							{busy ? 'Preparing PDF…' : 'Download letter PDF'}
						</button>
					</div>
					<p className="tool-message" role="status">{message}</p>
				</div>

				<section className="business-letter-preview" aria-label="Business letter preview">
					<header className="business-letter-preview-sender">
						<strong>{letter.senderName || 'Your name'}</strong>
						{letter.senderTitle && <span>{letter.senderTitle}</span>}
						{letter.senderDetails && <p>{letter.senderDetails}</p>}
					</header>
					<p className="business-letter-preview-date">{formatDate(letter.date)}</p>
					<div className="business-letter-preview-recipient">
						<strong>{letter.recipientName || 'Recipient name'}</strong>
						{letter.recipientTitle && <span>{letter.recipientTitle}</span>}
						{letter.recipientOrganization && <span>{letter.recipientOrganization}</span>}
						{letter.recipientDetails && <p>{letter.recipientDetails}</p>}
					</div>
					{letter.subject && <p className="business-letter-preview-subject"><strong>Subject: {letter.subject}</strong></p>}
					<p className="business-letter-preview-salutation">{letter.salutation}</p>
					<div className="business-letter-preview-body">{letter.body || 'Your letter body will appear here. Use blank lines to separate paragraphs.'}</div>
					<div className="business-letter-preview-signoff">
						<p>{letter.closing}</p>
						<strong>{letter.signatureName || 'Your name'}</strong>
						{letter.signatureTitle && <span>{letter.signatureTitle}</span>}
					</div>
				</section>
			</div>
			<p className="expense-privacy-note">Your letter is created in this browser and is not saved or uploaded. PDF export uses a built-in font that supports basic Latin and Western European characters.</p>
		</div>
	);
}
