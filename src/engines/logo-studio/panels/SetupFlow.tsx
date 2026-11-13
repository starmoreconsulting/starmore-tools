import { useState } from 'react';
import { logoPalettes } from '../library/palettes';
import type { LogoArrangement, LogoBrief, LogoIndustry, LogoStyle } from '../model/types';

interface Props {
	onComplete: (brief: LogoBrief) => void;
	onSkip: () => void;
}

const industries: LogoIndustry[] = ['Technology', 'Business', 'Fashion', 'Construction', 'Food', 'Transport', 'Education', 'Health', 'Creative', 'General'];
const styles: LogoStyle[] = ['Minimalist', 'Modern', 'Corporate', 'Luxury', 'Futuristic', 'Geometric', 'Vintage', 'Elegant', 'Bold', 'Abstract', 'Playful', 'Professional'];
const arrangements: { value: LogoArrangement; label: string }[] = [
	{ value: 'icon-above-text', label: 'Icon above text' },
	{ value: 'icon-left', label: 'Icon left' },
	{ value: 'icon-right', label: 'Icon right' },
	{ value: 'text-only', label: 'Text only' },
	{ value: 'badge', label: 'Badge' },
];

const initialBrief: LogoBrief = {
	businessName: '',
	tagline: '',
	industry: 'General',
	description: '',
	style: 'Modern',
	preferredPalette: logoPalettes[1].name,
	arrangement: 'icon-above-text',
};

export default function SetupFlow({ onComplete, onSkip }: Props) {
	const [step, setStep] = useState(0);
	const [brief, setBrief] = useState<LogoBrief>(initialBrief);
	const update = <K extends keyof LogoBrief>(key: K, value: LogoBrief[K]) => setBrief((current) => ({ ...current, [key]: value }));
	const steps = ['Name', 'Business', 'Style', 'Colours', 'Arrangement'];
	const finish = () => {
		const businessName = brief.businessName.trim();
		if (!businessName) return;
		onComplete({ ...brief, businessName, tagline: brief.tagline.trim(), description: brief.description.trim() });
	};

	return (
		<div className="logo-setup-overlay">
		<section className="logo-setup" role="dialog" aria-modal="true" aria-labelledby="logo-setup-title">
			<header className="logo-setup-header">
				<div><p className="eyebrow">A FEW QUICK CHOICES</p><h2 id="logo-setup-title">Start a new logo</h2></div>
				<button type="button" onClick={onSkip}>Skip, start blank</button>
			</header>
			<nav className="logo-setup-progress" aria-label="Setup progress">
				{steps.map((label, index) => <span key={label} aria-current={index === step ? 'step' : undefined}>{index + 1}. {label}</span>)}
			</nav>
			<div className="logo-setup-fields">
				{step === 0 && <>
					<label className="logo-phase-field"><span>Business name <strong aria-hidden="true">*</strong></span><input autoFocus maxLength={200} required value={brief.businessName} onChange={(event) => update('businessName', event.target.value)} placeholder="e.g. Northstar Studio" /></label>
					<label className="logo-phase-field"><span>Tagline <small>Optional</small></span><input maxLength={300} value={brief.tagline} onChange={(event) => update('tagline', event.target.value)} placeholder="A short phrase about your business" /></label>
				</>}
				{step === 1 && <>
					<label className="logo-phase-field"><span>Industry</span><select value={brief.industry} onChange={(event) => update('industry', event.target.value as LogoIndustry)}>{industries.map((industry) => <option key={industry}>{industry}</option>)}</select></label>
					<label className="logo-phase-field"><span>Short description <small>Optional</small></span><textarea rows={3} maxLength={1000} value={brief.description} onChange={(event) => update('description', event.target.value)} placeholder="What does your business do?" /></label>
				</>}
				{step === 2 && <label className="logo-phase-field"><span>Style</span><select value={brief.style} onChange={(event) => update('style', event.target.value as LogoStyle)}>{styles.map((style) => <option key={style}>{style}</option>)}</select></label>}
				{step === 3 && <>
					<label className="logo-phase-field"><span>Preferred palette</span><select value={brief.preferredPalette} onChange={(event) => update('preferredPalette', event.target.value)}>{logoPalettes.map((palette) => <option key={palette.name}>{palette.name}</option>)}<option value="Custom">Custom colour</option></select></label>
					{brief.preferredPalette === 'Custom' && <label className="logo-phase-field"><span>Custom colour</span><input type="color" value={brief.customColor ?? '#203b32'} onChange={(event) => update('customColor', event.target.value)} /></label>}
				</>}
				{step === 4 && <fieldset className="logo-setup-arrangements"><legend>Arrangement</legend>{arrangements.map(({ value, label }) => <label key={value}><input type="radio" name="logo-arrangement" value={value} checked={brief.arrangement === value} onChange={() => update('arrangement', value)} />{label}</label>)}</fieldset>}
			</div>
			<footer className="logo-setup-actions">
				<button type="button" onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0}>Back</button>
				<button type="button" onClick={onSkip}>Skip, start blank</button>
				{step < steps.length - 1
					? <button type="button" className="logo-phase-primary" disabled={step === 0 && !brief.businessName.trim()} onClick={() => setStep((current) => current + 1)}>Next</button>
					: <button type="button" className="logo-phase-primary" disabled={!brief.businessName.trim()} onClick={finish}>Create designs</button>}
			</footer>
		</section>
		</div>
	);
}
