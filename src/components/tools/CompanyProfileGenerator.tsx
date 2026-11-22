import { useState } from 'react';
import {
	COMPANY_PROFILE_MAX_NAME_LENGTH,
	COMPANY_PROFILE_MAX_TEXT_LENGTH,
	COMPANY_PROFILE_MAX_YEAR,
	createCompanyProfilePdf,
	type CompanyProfileInput,
} from '../../engines/company-profile';
import { triggerDownload } from '../../engines/pdf';

function safeFilename(value: string): string {
	const name = value.trim().replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 60);
	return `${name || 'company-profile'}.pdf`;
}

function initialProfile(): CompanyProfileInput {
	return {
		companyName: '',
		tagline: '',
		industry: '',
		foundedYear: null,
		headquarters: '',
		website: '',
		email: '',
		phone: '',
		overview: '',
		mission: '',
		vision: '',
		values: '',
		services: '',
		market: '',
		differentiators: '',
	};
}

type CompanyProfileTextKey = 'overview' | 'mission' | 'vision' | 'values' | 'services' | 'market' | 'differentiators';

const profileSections: { key: CompanyProfileTextKey; id: string; label: string; placeholder: string }[] = [
	{ key: 'overview', id: 'company-overview', label: 'Company overview *', placeholder: 'What does your company do, and how did it begin?' },
	{ key: 'mission', id: 'company-mission', label: 'Mission', placeholder: 'What is your company here to do?' },
	{ key: 'vision', id: 'company-vision', label: 'Vision', placeholder: 'What future are you working toward?' },
	{ key: 'values', id: 'company-values', label: 'Values', placeholder: 'Describe the principles that guide your work.' },
	{ key: 'services', id: 'company-services', label: 'Products and services', placeholder: 'List your key products and services, one per line.' },
	{ key: 'market', id: 'company-market', label: 'Markets and clients', placeholder: 'Who do you serve, and where do you operate?' },
	{ key: 'differentiators', id: 'company-differentiators', label: 'What sets your company apart', placeholder: 'Describe your strengths, experience, or approach.' },
];

export default function CompanyProfileGenerator() {
	const [profile, setProfile] = useState(initialProfile);
	const [message, setMessage] = useState('Your company profile is prepared locally in this browser.');
	const [busy, setBusy] = useState(false);

	const updateField = <K extends keyof CompanyProfileInput>(key: K, value: CompanyProfileInput[K]) => {
		setProfile((current) => ({ ...current, [key]: value }));
		setMessage('');
	};

	const downloadPdf = async () => {
		setBusy(true);
		setMessage('');
		try {
			const bytes = await createCompanyProfilePdf(profile);
			triggerDownload(new Blob([bytes], { type: 'application/pdf' }), safeFilename(profile.companyName));
			setMessage('Company profile PDF downloaded.');
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Could not create the company profile PDF.');
		} finally {
			setBusy(false);
		}
	};

	return (
		<div>
			<div className="company-profile-columns">
				<div className="company-profile-form">
					<section className="company-profile-form-section">
						<h2>Company details</h2>
						<div className="calc-fields">
							<div className="calc-field">
								<label htmlFor="company-name">Company name *</label>
								<input id="company-name" maxLength={COMPANY_PROFILE_MAX_NAME_LENGTH} required value={profile.companyName} onChange={(event) => updateField('companyName', event.target.value)} placeholder="Your company" />
							</div>
							<div className="calc-field">
								<label htmlFor="company-tagline">Tagline</label>
								<input id="company-tagline" maxLength={COMPANY_PROFILE_MAX_NAME_LENGTH} value={profile.tagline} onChange={(event) => updateField('tagline', event.target.value)} placeholder="A short phrase about your company" />
							</div>
							<div className="calc-field">
								<label htmlFor="company-industry">Industry</label>
								<input id="company-industry" maxLength={COMPANY_PROFILE_MAX_NAME_LENGTH} value={profile.industry} onChange={(event) => updateField('industry', event.target.value)} placeholder="Industry or sector" />
							</div>
							<div className="calc-field">
								<label htmlFor="company-founded">Year established</label>
								<input id="company-founded" type="number" min="1800" max={COMPANY_PROFILE_MAX_YEAR} step="1" value={profile.foundedYear ?? ''} onChange={(event) => updateField('foundedYear', event.target.value === '' ? null : Number(event.target.value))} placeholder="Optional" />
							</div>
							<div className="calc-field">
								<label htmlFor="company-headquarters">Headquarters</label>
								<input id="company-headquarters" maxLength={COMPANY_PROFILE_MAX_NAME_LENGTH} value={profile.headquarters} onChange={(event) => updateField('headquarters', event.target.value)} placeholder="City, country" />
							</div>
						</div>
					</section>

					<section className="company-profile-form-section">
						<h2>About the company</h2>
						<div className="company-profile-text-fields">
							{profileSections.map(({ key, id, label, placeholder }) => (
								<div className="calc-field" key={id}>
									<label htmlFor={id}>{label}</label>
									<textarea
										id={id}
										maxLength={COMPANY_PROFILE_MAX_TEXT_LENGTH}
										required={key === 'overview'}
										rows={key === 'overview' ? 4 : 3}
										value={profile[key]}
										onChange={(event) => updateField(key, event.target.value)}
										placeholder={placeholder}
									/>
								</div>
							))}
						</div>
					</section>

					<section className="company-profile-form-section">
						<h2>Contact details</h2>
						<div className="calc-fields">
							<div className="calc-field">
								<label htmlFor="company-website">Website</label>
								<input id="company-website" type="url" maxLength={COMPANY_PROFILE_MAX_NAME_LENGTH} value={profile.website} onChange={(event) => updateField('website', event.target.value)} placeholder="https://example.com" />
							</div>
							<div className="calc-field">
								<label htmlFor="company-email">Email</label>
								<input id="company-email" type="email" maxLength={COMPANY_PROFILE_MAX_NAME_LENGTH} value={profile.email} onChange={(event) => updateField('email', event.target.value)} placeholder="hello@example.com" />
							</div>
							<div className="calc-field">
								<label htmlFor="company-phone">Phone</label>
								<input id="company-phone" type="tel" maxLength={COMPANY_PROFILE_MAX_NAME_LENGTH} value={profile.phone} onChange={(event) => updateField('phone', event.target.value)} placeholder="+234 ..." />
							</div>
						</div>
					</section>

					<div className="tool-actions">
						<button className="tool-button" type="button" disabled={busy} onClick={downloadPdf}>
							{busy ? 'Preparing PDF…' : 'Download company profile PDF'}
						</button>
					</div>
					<p className="tool-message" role="status">{message}</p>
				</div>

				<section className="company-profile-preview" aria-label="Company profile preview">
					<header className="company-profile-preview-header">
						<p className="invoice-generator-kicker">COMPANY PROFILE</p>
						<h2>{profile.companyName || 'Your Company'}</h2>
						{profile.tagline && <p className="company-profile-tagline">{profile.tagline}</p>}
						<div className="company-profile-facts">
							{profile.industry && <span>{profile.industry}</span>}
							{profile.foundedYear && <span>Established {profile.foundedYear}</span>}
							{profile.headquarters && <span>{profile.headquarters}</span>}
						</div>
					</header>
					{profileSections.map(({ key, label }) => Boolean(profile[key]) && (
						<section className="company-profile-preview-section" key={key}>
							<h3>{label.replace(' *', '')}</h3>
							<p>{profile[key]}</p>
						</section>
					))}
					{(profile.website || profile.email || profile.phone) && (
						<section className="company-profile-preview-section">
							<h3>Contact</h3>
							<div className="company-profile-contact">
								{profile.website && <span>{profile.website}</span>}
								{profile.email && <span>{profile.email}</span>}
								{profile.phone && <span>{profile.phone}</span>}
							</div>
						</section>
					)}
					{!profile.overview && <p className="company-profile-empty">Enter company information to build your profile preview.</p>}
				</section>
			</div>
		</div>
	);
}
