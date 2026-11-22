import { useState } from 'react';
import {
	createResumePdf,
	RESUME_MAX_ENTRIES,
	RESUME_MAX_ENTRY_LENGTH,
	RESUME_MAX_NAME_LENGTH,
	RESUME_MAX_SKILLS_LENGTH,
	RESUME_MAX_TEXT_LENGTH,
	type ResumeEducation,
	type ResumeExperience,
	type ResumeInput,
} from '../../engines/resume-builder';
import { triggerDownload } from '../../engines/pdf';

function initialResume(): ResumeInput {
	return {
		fullName: '',
		professionalTitle: '',
		email: '',
		phone: '',
		location: '',
		website: '',
		summary: '',
		skills: '',
		experience: [],
		education: [],
	};
}

function safeFilename(value: string): string {
	const name = value.trim().replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 60);
	return `${name || 'resume'}.pdf`;
}

function period(start: string, end: string): string {
	if (!start && !end) return '';
	return `${start || '—'} - ${end || 'Present'}`;
}

export default function ResumeBuilder() {
	const [resume, setResume] = useState(initialResume);
	const [message, setMessage] = useState('Your resume is prepared locally in this browser.');
	const [busy, setBusy] = useState(false);

	const updateField = <K extends keyof Omit<ResumeInput, 'experience' | 'education'>>(key: K, value: ResumeInput[K]) => {
		setResume((current) => ({ ...current, [key]: value }));
		setMessage('');
	};

	const addExperience = () => {
		if (resume.experience.length >= RESUME_MAX_ENTRIES) {
			setMessage(`Add up to ${RESUME_MAX_ENTRIES} work experience entries.`);
			return;
		}
		const item: ResumeExperience = {
			id: crypto.randomUUID(),
			jobTitle: '',
			company: '',
			location: '',
			startDate: '',
			endDate: '',
			description: '',
		};
		setResume((current) => ({ ...current, experience: [...current.experience, item] }));
		setMessage('');
	};

	const updateExperience = <K extends keyof Omit<ResumeExperience, 'id'>>(id: string, key: K, value: ResumeExperience[K]) => {
		setResume((current) => ({
			...current,
			experience: current.experience.map((item) => item.id === id ? { ...item, [key]: value } : item),
		}));
		setMessage('');
	};

	const removeExperience = (id: string) => {
		setResume((current) => ({ ...current, experience: current.experience.filter((item) => item.id !== id) }));
		setMessage('Work experience removed.');
	};

	const addEducation = () => {
		if (resume.education.length >= RESUME_MAX_ENTRIES) {
			setMessage(`Add up to ${RESUME_MAX_ENTRIES} education entries.`);
			return;
		}
		const item: ResumeEducation = {
			id: crypto.randomUUID(),
			qualification: '',
			institution: '',
			location: '',
			startDate: '',
			endDate: '',
			details: '',
		};
		setResume((current) => ({ ...current, education: [...current.education, item] }));
		setMessage('');
	};

	const updateEducation = <K extends keyof Omit<ResumeEducation, 'id'>>(id: string, key: K, value: ResumeEducation[K]) => {
		setResume((current) => ({
			...current,
			education: current.education.map((item) => item.id === id ? { ...item, [key]: value } : item),
		}));
		setMessage('');
	};

	const removeEducation = (id: string) => {
		setResume((current) => ({ ...current, education: current.education.filter((item) => item.id !== id) }));
		setMessage('Education entry removed.');
	};

	const downloadPdf = async () => {
		setBusy(true);
		setMessage('');
		try {
			const bytes = await createResumePdf(resume);
			triggerDownload(new Blob([bytes], { type: 'application/pdf' }), safeFilename(resume.fullName));
			setMessage('Resume PDF downloaded.');
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Could not create the resume PDF.');
		} finally {
			setBusy(false);
		}
	};

	return (
		<div className="resume-builder">
			<div className="resume-builder-columns">
				<div className="resume-builder-form">
					<section className="resume-form-section">
						<h2>Contact details</h2>
						<div className="calc-fields">
							<div className="calc-field">
								<label htmlFor="resume-name">Full name *</label>
								<input id="resume-name" maxLength={RESUME_MAX_NAME_LENGTH} required value={resume.fullName} onChange={(event) => updateField('fullName', event.target.value)} placeholder="Your name" />
							</div>
							<div className="calc-field">
								<label htmlFor="resume-title">Professional title</label>
								<input id="resume-title" maxLength={RESUME_MAX_NAME_LENGTH} value={resume.professionalTitle} onChange={(event) => updateField('professionalTitle', event.target.value)} placeholder="Role or specialty" />
							</div>
							<div className="calc-field">
								<label htmlFor="resume-email">Email</label>
								<input id="resume-email" type="email" maxLength={RESUME_MAX_NAME_LENGTH} value={resume.email} onChange={(event) => updateField('email', event.target.value)} placeholder="you@example.com" />
							</div>
							<div className="calc-field">
								<label htmlFor="resume-phone">Phone</label>
								<input id="resume-phone" type="tel" maxLength={RESUME_MAX_NAME_LENGTH} value={resume.phone} onChange={(event) => updateField('phone', event.target.value)} placeholder="Phone number" />
							</div>
							<div className="calc-field">
								<label htmlFor="resume-location">Location</label>
								<input id="resume-location" maxLength={RESUME_MAX_NAME_LENGTH} value={resume.location} onChange={(event) => updateField('location', event.target.value)} placeholder="City, country" />
							</div>
							<div className="calc-field">
								<label htmlFor="resume-website">Website / portfolio</label>
								<input id="resume-website" type="url" maxLength={RESUME_MAX_NAME_LENGTH} value={resume.website} onChange={(event) => updateField('website', event.target.value)} placeholder="https://example.com" />
							</div>
						</div>
					</section>

					<section className="resume-form-section">
						<h2>Professional summary</h2>
						<div className="calc-field">
							<label htmlFor="resume-summary">Summary</label>
							<textarea id="resume-summary" maxLength={RESUME_MAX_TEXT_LENGTH} rows={5} value={resume.summary} onChange={(event) => updateField('summary', event.target.value)} placeholder="Briefly describe your experience, strengths, and career focus." />
						</div>
					</section>

					<section className="resume-form-section">
						<div className="resume-section-heading">
							<div><h2>Work experience</h2><p>{resume.experience.length} of {RESUME_MAX_ENTRIES} entries</p></div>
							<button className="tool-button secondary" type="button" disabled={resume.experience.length >= RESUME_MAX_ENTRIES} onClick={addExperience}>Add experience</button>
						</div>
						{resume.experience.map((item, index) => (
							<fieldset className="resume-entry" key={item.id}>
								<legend>Experience {index + 1}</legend>
								<button className="expense-delete-button resume-remove-button" type="button" aria-label={`Remove experience ${index + 1}`} onClick={() => removeExperience(item.id)}>Remove</button>
								<div className="calc-fields">
									<div className="calc-field">
										<label htmlFor={`resume-job-${index}`}>Job title *</label>
										<input id={`resume-job-${index}`} maxLength={RESUME_MAX_ENTRY_LENGTH} value={item.jobTitle} onChange={(event) => updateExperience(item.id, 'jobTitle', event.target.value)} placeholder="Job title" />
									</div>
									<div className="calc-field">
										<label htmlFor={`resume-company-${index}`}>Company *</label>
										<input id={`resume-company-${index}`} maxLength={RESUME_MAX_ENTRY_LENGTH} value={item.company} onChange={(event) => updateExperience(item.id, 'company', event.target.value)} placeholder="Company" />
									</div>
									<div className="calc-field">
										<label htmlFor={`resume-exp-start-${index}`}>Start (YYYY-MM) *</label>
										<input id={`resume-exp-start-${index}`} maxLength={7} value={item.startDate} onChange={(event) => updateExperience(item.id, 'startDate', event.target.value)} placeholder="2022-01" />
									</div>
									<div className="calc-field">
										<label htmlFor={`resume-exp-end-${index}`}>End (YYYY-MM or Present)</label>
										<input id={`resume-exp-end-${index}`} maxLength={7} value={item.endDate} onChange={(event) => updateExperience(item.id, 'endDate', event.target.value)} placeholder="Present" />
									</div>
									<div className="calc-field resume-entry-full">
										<label htmlFor={`resume-exp-location-${index}`}>Location</label>
										<input id={`resume-exp-location-${index}`} maxLength={RESUME_MAX_ENTRY_LENGTH} value={item.location} onChange={(event) => updateExperience(item.id, 'location', event.target.value)} placeholder="City, country or remote" />
									</div>
									<div className="calc-field resume-entry-full">
										<label htmlFor={`resume-exp-description-${index}`}>Responsibilities and achievements</label>
										<textarea id={`resume-exp-description-${index}`} maxLength={RESUME_MAX_TEXT_LENGTH} rows={4} value={item.description} onChange={(event) => updateExperience(item.id, 'description', event.target.value)} placeholder="Describe results and responsibilities, one per line." />
									</div>
								</div>
							</fieldset>
						))}
						{!resume.experience.length && <p className="resume-empty-section">Add work history, or leave this section empty.</p>}
					</section>

					<section className="resume-form-section">
						<div className="resume-section-heading">
							<div><h2>Education</h2><p>{resume.education.length} of {RESUME_MAX_ENTRIES} entries</p></div>
							<button className="tool-button secondary" type="button" disabled={resume.education.length >= RESUME_MAX_ENTRIES} onClick={addEducation}>Add education</button>
						</div>
						{resume.education.map((item, index) => (
							<fieldset className="resume-entry" key={item.id}>
								<legend>Education {index + 1}</legend>
								<button className="expense-delete-button resume-remove-button" type="button" aria-label={`Remove education ${index + 1}`} onClick={() => removeEducation(item.id)}>Remove</button>
								<div className="calc-fields">
									<div className="calc-field">
										<label htmlFor={`resume-qualification-${index}`}>Qualification *</label>
										<input id={`resume-qualification-${index}`} maxLength={RESUME_MAX_ENTRY_LENGTH} value={item.qualification} onChange={(event) => updateEducation(item.id, 'qualification', event.target.value)} placeholder="Degree or certificate" />
									</div>
									<div className="calc-field">
										<label htmlFor={`resume-institution-${index}`}>Institution *</label>
										<input id={`resume-institution-${index}`} maxLength={RESUME_MAX_ENTRY_LENGTH} value={item.institution} onChange={(event) => updateEducation(item.id, 'institution', event.target.value)} placeholder="School or institution" />
									</div>
									<div className="calc-field">
										<label htmlFor={`resume-edu-start-${index}`}>Start (YYYY-MM) *</label>
										<input id={`resume-edu-start-${index}`} maxLength={7} value={item.startDate} onChange={(event) => updateEducation(item.id, 'startDate', event.target.value)} placeholder="2018-09" />
									</div>
									<div className="calc-field">
										<label htmlFor={`resume-edu-end-${index}`}>End (YYYY-MM or Present)</label>
										<input id={`resume-edu-end-${index}`} maxLength={7} value={item.endDate} onChange={(event) => updateEducation(item.id, 'endDate', event.target.value)} placeholder="2022-05" />
									</div>
									<div className="calc-field resume-entry-full">
										<label htmlFor={`resume-edu-location-${index}`}>Location</label>
										<input id={`resume-edu-location-${index}`} maxLength={RESUME_MAX_ENTRY_LENGTH} value={item.location} onChange={(event) => updateEducation(item.id, 'location', event.target.value)} placeholder="City, country" />
									</div>
									<div className="calc-field resume-entry-full">
										<label htmlFor={`resume-edu-details-${index}`}>Details</label>
										<textarea id={`resume-edu-details-${index}`} maxLength={RESUME_MAX_TEXT_LENGTH} rows={3} value={item.details} onChange={(event) => updateEducation(item.id, 'details', event.target.value)} placeholder="Relevant achievements or coursework." />
									</div>
								</div>
							</fieldset>
						))}
						{!resume.education.length && <p className="resume-empty-section">Add education, or leave this section empty.</p>}
					</section>

					<section className="resume-form-section">
						<h2>Skills</h2>
						<div className="calc-field">
							<label htmlFor="resume-skills">Skills</label>
							<textarea id="resume-skills" maxLength={RESUME_MAX_SKILLS_LENGTH} rows={3} value={resume.skills} onChange={(event) => updateField('skills', event.target.value)} placeholder="Enter skills separated by commas or new lines." />
						</div>
					</section>

					<div className="tool-actions">
						<button className="tool-button" type="button" disabled={busy || !resume.fullName.trim()} onClick={downloadPdf}>{busy ? 'Preparing PDF…' : 'Download resume PDF'}</button>
					</div>
					<p className="tool-message" role="status">{message}</p>
				</div>

				<article className="resume-preview" aria-label="Resume preview">
					<header className="resume-preview-header">
						<p className="invoice-generator-kicker">RESUME</p>
						<h2>{resume.fullName || 'Your Name'}</h2>
						{resume.professionalTitle && <p className="resume-preview-title">{resume.professionalTitle}</p>}
						<div className="resume-preview-contact">
							{[resume.email, resume.phone, resume.location, resume.website].filter(Boolean).map((value, index) => <span key={`${index}-${value}`}>{value}</span>)}
						</div>
					</header>
					{resume.summary && <section className="resume-preview-section"><h3>Professional Summary</h3><p>{resume.summary}</p></section>}
					{resume.experience.length > 0 && <section className="resume-preview-section">
						<h3>Work Experience</h3>
						{resume.experience.map((item) => (
							<div className="resume-preview-entry" key={item.id}>
								<div className="resume-preview-entry-heading"><strong>{item.jobTitle || 'Job title'}{item.company && ` · ${item.company}`}</strong><span>{period(item.startDate, item.endDate)}</span></div>
								{item.location && <p className="resume-preview-muted">{item.location}</p>}
								{item.description && <p>{item.description}</p>}
							</div>
						))}
					</section>}
					{resume.education.length > 0 && <section className="resume-preview-section">
						<h3>Education</h3>
						{resume.education.map((item) => (
							<div className="resume-preview-entry" key={item.id}>
								<div className="resume-preview-entry-heading"><strong>{item.qualification || 'Qualification'}{item.institution && ` · ${item.institution}`}</strong><span>{period(item.startDate, item.endDate)}</span></div>
								{item.location && <p className="resume-preview-muted">{item.location}</p>}
								{item.details && <p>{item.details}</p>}
							</div>
						))}
					</section>}
					{resume.skills && <section className="resume-preview-section"><h3>Skills</h3><p>{resume.skills.split(/[\n,]/).map((skill) => skill.trim()).filter(Boolean).join(' · ')}</p></section>}
					{!resume.summary && !resume.experience.length && !resume.education.length && !resume.skills && <p className="resume-empty-section">Your resume preview will appear here as you add details.</p>}
					<p className="resume-preview-footnote">Simple, text-first layout designed for readability and ATS compatibility.</p>
				</article>
			</div>
			<p className="resume-privacy-note">Your resume details are used in this browser session to prepare the preview and PDF. They are not uploaded or saved.</p>
		</div>
	);
}
