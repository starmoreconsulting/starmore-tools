import { useEffect, useState } from 'react';
import type { BrandKit, BrandProfile } from '../../logo-studio/brand/kit';
import type { LogoProject } from '../../logo-studio/model/types';
import { getDesignLayouts, type DesignType } from '../designs/generate';

interface Props {
	project: LogoProject;
	kit: BrandKit | null;
	onChange: (profile: BrandProfile, layoutId: string) => void;
}

const EMPTY_PROFILE: BrandProfile = {
	businessName: '', tagline: '', contactName: '', jobTitle: '', phone: '', email: '', website: '',
	address: '', socialHandles: { instagram: '', facebook: '', linkedin: '', youtube: '', x: '' },
};

const PROFILE_FIELDS: Array<[Exclude<keyof BrandProfile, 'socialHandles'>, string]> = [
	['businessName', 'Business name'],
	['tagline', 'Tagline'],
	['contactName', 'Contact name'],
	['jobTitle', 'Job title'],
	['phone', 'Phone'],
	['email', 'Email'],
	['website', 'Website'],
	['address', 'Address'],
];

const SOCIAL_FIELDS: Array<[keyof BrandProfile['socialHandles'], string]> = [
	['instagram', 'Instagram'],
	['facebook', 'Facebook'],
	['linkedin', 'LinkedIn'],
	['youtube', 'YouTube'],
	['x', 'X'],
];

function currentProfile(kit: BrandKit | null): BrandProfile {
	return kit?.profile ? structuredClone(kit.profile) : structuredClone(EMPTY_PROFILE);
}

export default function DesignDetailsPanel({ project, kit, onChange }: Props) {
	const layoutId = project.generation?.layoutId ?? '';
	const [type, currentLayout = 'centered'] = layoutId.split(':');
	const [profile, setProfile] = useState<BrandProfile>(() => currentProfile(kit));
	const layouts = getDesignLayouts(type as DesignType);

	useEffect(() => {
		setProfile(currentProfile(kit));
	}, [project.id, kit?.id]);

	const update = (key: Exclude<keyof BrandProfile, 'socialHandles'>, value: string) => {
		const next = { ...profile, [key]: value };
		setProfile(next);
		onChange(next, currentLayout);
	};
	const updateSocial = (key: keyof BrandProfile['socialHandles'], value: string) => {
		const next = { ...profile, socialHandles: { ...profile.socialHandles, [key]: value } };
		setProfile(next);
		onChange(next, currentLayout);
	};
	const isAddress = (key: string) => key === 'address';

	return (
		<section className="logo-phase-panel brand-design-details" aria-labelledby="brand-design-details-title">
			<h2 id="brand-design-details-title">Design details</h2>
			<p className="brand-design-size">{project.artboard.width} × {project.artboard.height} {project.artboard.width > 500 ? 'px' : 'mm'}</p>
			<label className="logo-phase-field">
				<span>Layout</span>
				<select value={currentLayout} onChange={(event) => onChange(profile, event.target.value)}>
					{layouts.map((layout) => <option key={layout} value={layout}>{layout.replaceAll('-', ' ')}</option>)}
				</select>
			</label>
			{PROFILE_FIELDS.map(([key, label]) => (
				<label className="logo-phase-field" key={key}>
					<span>{label}</span>
					{isAddress(key)
						? <textarea rows={3} value={profile[key]} onChange={(event) => update(key, event.target.value)} />
						: <input
							type={key === 'email' ? 'email' : key === 'website' ? 'url' : 'text'}
							value={profile[key]}
							onChange={(event) => update(key, event.target.value)}
						/>}
				</label>
			))}
			<fieldset className="brand-design-social-fields">
				<legend>Social handles</legend>
				{SOCIAL_FIELDS.map(([key, label]) => (
					<label className="logo-phase-field" key={key}>
						<span>{label}</span>
						<input value={profile.socialHandles[key]} onChange={(event) => updateSocial(key, event.target.value)} />
					</label>
				))}
			</fieldset>
			<p className="logo-phase-hint">Details are saved with this project on this device.</p>
		</section>
	);
}
