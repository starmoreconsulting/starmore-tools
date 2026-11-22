import { useState } from 'react';
import {
	BUSINESS_PROPOSAL_CURRENCIES,
	BUSINESS_PROPOSAL_MAX_NAME_LENGTH,
	BUSINESS_PROPOSAL_MAX_NUMBER_LENGTH,
	BUSINESS_PROPOSAL_MAX_TEXT_LENGTH,
	createBusinessProposalPdf,
	formatBusinessProposalAmount,
	type BusinessProposalInput,
} from '../../engines/business-proposal';
import { isOneOf } from '../../engines/expense-tracker';
import { triggerDownload } from '../../engines/pdf';

function localDateString(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

function initialProposal(): BusinessProposalInput {
	const today = new Date();
	const validUntil = new Date(today);
	validUntil.setDate(validUntil.getDate() + 30);
	return {
		providerName: 'Your Business',
		providerDetails: '',
		clientName: '',
		clientDetails: '',
		proposalNumber: `PROP-${localDateString(today).replaceAll('-', '')}-001`,
		proposalDate: localDateString(today),
		validUntil: localDateString(validUntil),
		projectTitle: '',
		executiveSummary: '',
		clientNeeds: '',
		proposedSolution: '',
		scope: '',
		deliverables: '',
		timeline: '',
		currency: 'NGN',
		investment: null,
		terms: '',
	};
}

function safeFilename(value: string): string {
	const name = value.trim().replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 60);
	return `${name || 'business-proposal'}.pdf`;
}

function formatDate(value: string): string {
	if (!value) return '—';
	const date = new Date(`${value}T00:00:00`);
	return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(date);
}

export default function BusinessProposalGenerator() {
	const [proposal, setProposal] = useState(initialProposal);
	const [message, setMessage] = useState('Your proposal is prepared locally in this browser.');
	const [busy, setBusy] = useState(false);

	const updateField = <K extends keyof BusinessProposalInput>(key: K, value: BusinessProposalInput[K]) => {
		setProposal((current) => ({ ...current, [key]: value }));
		setMessage('');
	};

	const downloadPdf = async () => {
		setBusy(true);
		setMessage('');
		try {
			const bytes = await createBusinessProposalPdf(proposal);
			triggerDownload(new Blob([bytes], { type: 'application/pdf' }), safeFilename(proposal.proposalNumber));
			setMessage('Business proposal PDF downloaded.');
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Could not create the business proposal PDF.');
		} finally {
			setBusy(false);
		}
	};

	const textField = (
		key: keyof BusinessProposalInput,
		id: string,
		label: string,
		value: string,
		required: boolean,
		placeholder: string,
		rows = 3,
	) => (
		<div className="calc-field">
			<label htmlFor={id}>{label}{required ? ' *' : ''}</label>
			<textarea
				id={id}
				maxLength={BUSINESS_PROPOSAL_MAX_TEXT_LENGTH}
				rows={rows}
				required={required}
				value={value}
				onChange={(event) => updateField(key, event.target.value)}
				placeholder={placeholder}
			/>
		</div>
	);

	return (
		<div>
			<div className="proposal-columns">
				<div className="proposal-form">
					<section className="proposal-form-section">
						<h2>Proposal details</h2>
						<div className="calc-fields">
							<div className="calc-field">
								<label htmlFor="proposal-provider">Your business name *</label>
								<input id="proposal-provider" maxLength={BUSINESS_PROPOSAL_MAX_NAME_LENGTH} required value={proposal.providerName} onChange={(event) => updateField('providerName', event.target.value)} />
							</div>
							<div className="calc-field">
								<label htmlFor="proposal-provider-details">Your contact details</label>
								<textarea id="proposal-provider-details" maxLength={BUSINESS_PROPOSAL_MAX_TEXT_LENGTH} rows={2} value={proposal.providerDetails} onChange={(event) => updateField('providerDetails', event.target.value)} placeholder="Address, email, phone" />
							</div>
							<div className="calc-field">
								<label htmlFor="proposal-client">Prepared for *</label>
								<input id="proposal-client" maxLength={BUSINESS_PROPOSAL_MAX_NAME_LENGTH} required value={proposal.clientName} onChange={(event) => updateField('clientName', event.target.value)} placeholder="Client or organization" />
							</div>
							<div className="calc-field">
								<label htmlFor="proposal-client-details">Client contact details</label>
								<textarea id="proposal-client-details" maxLength={BUSINESS_PROPOSAL_MAX_TEXT_LENGTH} rows={2} value={proposal.clientDetails} onChange={(event) => updateField('clientDetails', event.target.value)} placeholder="Address, contact, or department" />
							</div>
							<div className="calc-field">
								<label htmlFor="proposal-number">Proposal number *</label>
								<input id="proposal-number" maxLength={BUSINESS_PROPOSAL_MAX_NUMBER_LENGTH} required value={proposal.proposalNumber} onChange={(event) => updateField('proposalNumber', event.target.value)} />
							</div>
							<div className="proposal-date-fields">
								<div className="calc-field">
									<label htmlFor="proposal-date">Proposal date</label>
									<input id="proposal-date" type="date" value={proposal.proposalDate} onChange={(event) => updateField('proposalDate', event.target.value)} />
								</div>
								<div className="calc-field">
									<label htmlFor="proposal-valid-until">Valid until</label>
									<input id="proposal-valid-until" type="date" value={proposal.validUntil} onChange={(event) => updateField('validUntil', event.target.value)} />
								</div>
							</div>
							<div className="calc-field proposal-project-title">
								<label htmlFor="proposal-project-title">Project title *</label>
								<input id="proposal-project-title" maxLength={BUSINESS_PROPOSAL_MAX_NAME_LENGTH} required value={proposal.projectTitle} onChange={(event) => updateField('projectTitle', event.target.value)} placeholder="Project or engagement name" />
							</div>
						</div>
					</section>

					<section className="proposal-form-section">
						<h2>Project plan</h2>
						<div className="proposal-text-fields">
							{textField('executiveSummary', 'proposal-summary', 'Executive summary', proposal.executiveSummary, true, 'Briefly describe the opportunity and proposed outcome.')}
							{textField('clientNeeds', 'proposal-client-needs', 'Client needs / challenge', proposal.clientNeeds, true, 'What need, challenge, or goal does the client have?')}
							{textField('proposedSolution', 'proposal-solution', 'Proposed solution', proposal.proposedSolution, true, 'Explain your recommended approach.')}
							{textField('scope', 'proposal-scope', 'Scope of work', proposal.scope, true, 'Describe the work included and any boundaries.')}
							{textField('deliverables', 'proposal-deliverables', 'Deliverables', proposal.deliverables, true, 'List the outputs the client can expect.')}
							{textField('timeline', 'proposal-timeline', 'Timeline and milestones', proposal.timeline, true, 'Describe phases, milestones, or estimated dates.')}
						</div>
					</section>

					<section className="proposal-form-section">
						<h2>Investment and terms</h2>
						<p className="inline-note">Optional estimate only. A proposal is not an invoice, quote, or request for payment.</p>
						<div className="proposal-investment-fields">
							<div className="calc-field">
								<label htmlFor="proposal-currency">Currency</label>
								<select id="proposal-currency" value={proposal.currency} onChange={(event) => {
									if (isOneOf(event.target.value, BUSINESS_PROPOSAL_CURRENCIES)) updateField('currency', event.target.value);
								}}>
									{BUSINESS_PROPOSAL_CURRENCIES.map((currency) => <option key={currency}>{currency}</option>)}
								</select>
							</div>
							<div className="calc-field">
								<label htmlFor="proposal-investment">Investment estimate (optional)</label>
								<input id="proposal-investment" type="number" min="0" step="0.01" value={proposal.investment ?? ''} onChange={(event) => updateField('investment', event.target.value === '' ? null : Number(event.target.value))} placeholder="Leave blank to omit" />
							</div>
						</div>
						{textField('terms', 'proposal-terms', 'Terms, assumptions, or exclusions', proposal.terms, false, 'Payment terms, assumptions, exclusions, or next steps.', 4)}
					</section>

					<div className="tool-actions">
						<button className="tool-button" type="button" disabled={busy} onClick={downloadPdf}>
							{busy ? 'Preparing PDF…' : 'Download proposal PDF'}
						</button>
					</div>
					<p className="tool-message" role="status">{message}</p>
				</div>

				<section className="proposal-preview" aria-label="Business proposal preview">
					<header className="proposal-preview-header">
						<div>
							<p className="invoice-generator-kicker">BUSINESS PROPOSAL · {proposal.proposalNumber || 'PROPOSAL NUMBER'}</p>
							<h2>{proposal.projectTitle || 'Project title'}</h2>
							<p>{formatDate(proposal.proposalDate)} · Valid until {formatDate(proposal.validUntil)}</p>
						</div>
					</header>
					<div className="proposal-parties">
						<div><span>PREPARED BY</span><strong>{proposal.providerName || 'Your business'}</strong><p>{proposal.providerDetails || 'Your contact details'}</p></div>
						<div><span>PREPARED FOR</span><strong>{proposal.clientName || 'Client name'}</strong><p>{proposal.clientDetails || 'Client contact details'}</p></div>
					</div>
					{[
						['Executive summary', proposal.executiveSummary],
						['Client needs / challenge', proposal.clientNeeds],
						['Proposed solution', proposal.proposedSolution],
						['Scope of work', proposal.scope],
						['Deliverables', proposal.deliverables],
						['Timeline and milestones', proposal.timeline],
					].map(([heading, content]) => (
						<section className="proposal-preview-section" key={heading}>
							<h3>{heading}</h3>
							<p>{content || 'Add details in the form to build your proposal.'}</p>
						</section>
					))}
					{proposal.investment !== null && Number.isFinite(proposal.investment) && proposal.investment >= 0 && (
						<div className="proposal-investment-preview">
							<span>INVESTMENT ESTIMATE</span>
							<strong>{formatBusinessProposalAmount(proposal.investment, proposal.currency)}</strong>
							<small>Indicative only; final scope and terms require agreement.</small>
						</div>
					)}
					{proposal.terms && (
						<section className="proposal-preview-section">
							<h3>Terms, assumptions, or exclusions</h3>
							<p>{proposal.terms}</p>
						</section>
					)}
					<p className="proposal-disclaimer">A proposal describes a proposed engagement. It is not an invoice, quotation, or confirmation of payment.</p>
				</section>
			</div>
		</div>
	);
}
