import { useState } from 'react';
import {
	COVER_LETTER_MAX_BODY_LENGTH,
	COVER_LETTER_MAX_NAME_LENGTH,
	createCoverLetterPdf,
	type CoverLetterInput,
} from '../../engines/cover-letter';
import { triggerDownload } from '../../engines/pdf';

function localDateString(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

function initialCoverLetter(): CoverLetterInput {
	return {
		senderName: '',
		senderTitle: '',
		senderDetails: '',
		recipientName: '',
		recipientTitle: '',
		organization: '',
		recipientDetails: '',
		date: localDateString(new Date()),
		jobTitle: '',
		salutation: 'Dear Hiring Manager,',
		opening: '',
		body: '',
		closingParagraph: '',
		signoff: 'Sincerely,',
	};
}

function safeFilename(value: string): string {
	const name = value.trim().replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 60);
	return `${name || 'cover-letter'}.pdf`;
}

function formatDate(value: string): string {
	if (!value) return '—';
	const date = new Date(`${value}T00:00:00`);
	return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en', { dateStyle: 'long' }).format(date);
}

export default function CoverLetterBuilder() {
	const [letter, setLetter] = useState(initialCoverLetter);
	const [message, setMessage] = useState('Your cover letter is prepared locally in this browser.');
	const [busy, setBusy] = useState(false);

	const updateField = <K extends keyof CoverLetterInput>(key: K, value: CoverLetterInput[K]) => {
		setLetter((current) => ({ ...current, [key]: value }));
		setMessage('');
	};

	const downloadPdf = async () => {
		setBusy(true);
		setMessage('');
		try {
			const bytes = await createCoverLetterPdf(letter);
			triggerDownload(new Blob([bytes], { type: 'application/pdf' }), safeFilename(letter.senderName));
			setMessage('Cover letter PDF downloaded.');
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Could not create the cover letter PDF.');
		} finally {
			setBusy(false);
		}
	};

	return (
		<div>
			<div className="cover-letter-columns">
				<div className="cover-letter-form">
					<section className="cover-letter-form-section">
						<h2>Your details</h2>
						<div className="calc-fields">
							<div className="calc-field">
								<label htmlFor="cover-sender-name">Your name *</label>
								<input id="cover-sender-name" maxLength={COVER_LETTER_MAX_NAME_LENGTH} required value={letter.senderName} onChange={(event) => updateField('senderName', event.target.value)} placeholder="Your name" />
							</div>
							<div className="calc-field">
								<label htmlFor="cover-sender-title">Your title</label>
								<input id="cover-sender-title" maxLength={COVER_LETTER_MAX_NAME_LENGTH} value={letter.senderTitle} onChange={(event) => updateField('senderTitle', event.target.value)} placeholder="Current role or specialty" />
							</div>
							<div className="calc-field cover-letter-full-width">
								<label htmlFor="cover-sender-details">Contact details</label>
								<textarea id="cover-sender-details" maxLength={500} rows={2} value={letter.senderDetails} onChange={(event) => updateField('senderDetails', event.target.value)} placeholder="Email, phone, and address" />
							</div>
						</div>
					</section>

					<section className="cover-letter-form-section">
						<h2>Role and recipient</h2>
						<div className="calc-fields">
							<div className="calc-field">
								<label htmlFor="cover-job-title">Job title</label>
								<input id="cover-job-title" maxLength={COVER_LETTER_MAX_NAME_LENGTH} value={letter.jobTitle} onChange={(event) => updateField('jobTitle', event.target.value)} placeholder="Role you are applying for" />
							</div>
							<div className="calc-field">
								<label htmlFor="cover-date">Date</label>
								<input id="cover-date" type="date" value={letter.date} onChange={(event) => updateField('date', event.target.value)} />
							</div>
							<div className="calc-field">
								<label htmlFor="cover-recipient-name">Recipient name</label>
								<input id="cover-recipient-name" maxLength={COVER_LETTER_MAX_NAME_LENGTH} value={letter.recipientName} onChange={(event) => updateField('recipientName', event.target.value)} placeholder="Hiring manager" />
							</div>
							<div className="calc-field">
								<label htmlFor="cover-recipient-title">Recipient title</label>
								<input id="cover-recipient-title" maxLength={COVER_LETTER_MAX_NAME_LENGTH} value={letter.recipientTitle} onChange={(event) => updateField('recipientTitle', event.target.value)} placeholder="Optional" />
							</div>
							<div className="calc-field">
								<label htmlFor="cover-organization">Organization</label>
								<input id="cover-organization" maxLength={COVER_LETTER_MAX_NAME_LENGTH} value={letter.organization} onChange={(event) => updateField('organization', event.target.value)} placeholder="Company or organization" />
							</div>
							<div className="calc-field">
								<label htmlFor="cover-salutation">Salutation</label>
								<input id="cover-salutation" maxLength={COVER_LETTER_MAX_NAME_LENGTH} required value={letter.salutation} onChange={(event) => updateField('salutation', event.target.value)} />
							</div>
							<div className="calc-field cover-letter-full-width">
								<label htmlFor="cover-recipient-details">Recipient address</label>
								<textarea id="cover-recipient-details" maxLength={500} rows={2} value={letter.recipientDetails} onChange={(event) => updateField('recipientDetails', event.target.value)} placeholder="Address or location" />
							</div>
						</div>
					</section>

					<section className="cover-letter-form-section">
						<h2>Letter content</h2>
						<div className="cover-letter-text-fields">
							<div className="calc-field">
								<label htmlFor="cover-opening">Opening paragraph *</label>
								<textarea id="cover-opening" maxLength={COVER_LETTER_MAX_BODY_LENGTH} rows={4} required value={letter.opening} onChange={(event) => updateField('opening', event.target.value)} placeholder="Introduce yourself and the role you are applying for." />
							</div>
							<div className="calc-field">
								<label htmlFor="cover-body">Relevant experience and strengths</label>
								<textarea id="cover-body" maxLength={COVER_LETTER_MAX_BODY_LENGTH} rows={7} value={letter.body} onChange={(event) => updateField('body', event.target.value)} placeholder="Connect your experience and strengths to the role. Use blank lines for paragraphs." />
							</div>
							<div className="calc-field">
								<label htmlFor="cover-closing">Closing paragraph *</label>
								<textarea id="cover-closing" maxLength={COVER_LETTER_MAX_BODY_LENGTH} rows={3} required value={letter.closingParagraph} onChange={(event) => updateField('closingParagraph', event.target.value)} placeholder="Thank the reader and suggest a next step." />
							</div>
							<div className="calc-field">
								<label htmlFor="cover-signoff">Sign-off</label>
								<input id="cover-signoff" maxLength={COVER_LETTER_MAX_NAME_LENGTH} required value={letter.signoff} onChange={(event) => updateField('signoff', event.target.value)} />
							</div>
						</div>
					</section>

					<div className="tool-actions">
						<button className="tool-button" type="button" disabled={busy} onClick={downloadPdf}>{busy ? 'Preparing PDF…' : 'Download cover letter PDF'}</button>
					</div>
					<p className="tool-message" role="status">{message}</p>
				</div>

				<article className="cover-letter-preview" aria-label="Cover letter preview">
					<header className="cover-letter-preview-sender">
						<strong>{letter.senderName || 'Your name'}</strong>
						{letter.senderTitle && <span>{letter.senderTitle}</span>}
						{letter.senderDetails && <p>{letter.senderDetails}</p>}
					</header>
					<p className="cover-letter-preview-date">{formatDate(letter.date)}</p>
					<div className="cover-letter-preview-recipient">
						{letter.recipientName && <strong>{letter.recipientName}</strong>}
						{letter.recipientTitle && <span>{letter.recipientTitle}</span>}
						{letter.organization && <span>{letter.organization}</span>}
						{letter.recipientDetails && <p>{letter.recipientDetails}</p>}
					</div>
					{letter.jobTitle && <p className="cover-letter-preview-subject"><strong>Re: Application for {letter.jobTitle}</strong></p>}
					<p className="cover-letter-preview-salutation">{letter.salutation}</p>
					<p className="cover-letter-preview-body">{[letter.opening, letter.body, letter.closingParagraph].filter((value) => value.trim()).join('\n\n') || 'Your letter will appear here as you write.'}</p>
					<div className="cover-letter-preview-signoff">
						<span>{letter.signoff}</span>
						<p aria-hidden="true"></p>
						<strong>{letter.senderName || 'Your name'}</strong>
					</div>
				</article>
			</div>
			<p className="cover-letter-privacy-note">Your cover letter is prepared in this browser and is not saved or uploaded.</p>
		</div>
	);
}
