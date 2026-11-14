import { useEffect, useState } from 'react';
import {
	createBrandKitFromProject,
	createEmptyBrandKit,
	restoreBrandKitFonts,
	validateBrandKit,
	type BrandColorRole,
	type BrandKit,
	type BrandProfile,
} from '../brand/kit';
import type { LogoProject } from '../model/types';
import { listBrandKits, saveBrandKit, setActiveBrandKitId } from '../store/brand-kits';

interface Props {
	project: LogoProject;
	activeKit: BrandKit | null;
	onActiveChange: (kit: BrandKit) => void;
	onClose: () => void;
}

const EMPTY_PROFILE: BrandProfile = {
	businessName: '',
	tagline: '',
	contactName: '',
	jobTitle: '',
	phone: '',
	email: '',
	website: '',
	address: '',
	socialHandles: { instagram: '', facebook: '', linkedin: '', youtube: '', x: '' },
};
const COLOR_ROLES: BrandColorRole[] = ['primary', 'secondary', 'accent', 'light', 'dark'];

function suggestedRole(hex: string, index: number): BrandColorRole {
	if (index === 0) return 'primary';
	if (index === 1) return 'secondary';
	if (index === 2) return 'accent';
	const red = Number.parseInt(hex.slice(1, 3), 16);
	const green = Number.parseInt(hex.slice(3, 5), 16);
	const blue = Number.parseInt(hex.slice(5, 7), 16);
	const brightness = (red * 299 + green * 587 + blue * 114) / 1000;
	return brightness > 220 ? 'light' : brightness < 35 ? 'dark' : 'accent';
}

function withDefaults(kit: BrandKit): BrandKit {
	return {
		...kit,
		profile: kit.profile ?? structuredClone(EMPTY_PROFILE),
		colors: kit.colors.map((color, index) => ({ ...color, role: color.role ?? suggestedRole(color.hex, index) })),
	};
}

export default function BrandSetupScreen({ project, activeKit, onActiveChange, onClose }: Props) {
	const [kits, setKits] = useState<BrandKit[]>([]);
	const [kit, setKit] = useState<BrandKit | null>(activeKit ? withDefaults(activeKit) : null);
	const [savedKitId, setSavedKitId] = useState(activeKit?.id ?? '');
	const [error, setError] = useState('');
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		let active = true;
		void listBrandKits().then((saved) => {
			if (active) setKits(saved);
		}).catch((cause: unknown) => {
			if (active) setError(cause instanceof Error ? cause.message : 'Saved brand kits could not be loaded.');
		});
		return () => { active = false; };
	}, []);

	const chooseSource = async (source: 'scratch' | 'project' | 'saved') => {
		try {
			let next: BrandKit;
			if (source === 'scratch') next = createEmptyBrandKit();
			else if (source === 'project') next = await createBrandKitFromProject(project);
			else {
				const saved = kits.find((entry) => entry.id === savedKitId);
				if (!saved) throw new Error('Choose a saved brand kit first.');
				next = saved;
			}
			setKit(withDefaults(next));
			setError('');
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : 'The brand kit could not be prepared.');
		}
	};

	const updateProfile = (key: Exclude<keyof BrandProfile, 'socialHandles'>, value: string) => {
		setKit((current) => current ? {
			...current,
			profile: { ...(current.profile ?? structuredClone(EMPTY_PROFILE)), [key]: value },
		} : current);
	};

	const updateSocial = (key: keyof BrandProfile['socialHandles'], value: string) => {
		setKit((current) => current ? {
			...current,
			profile: {
				...(current.profile ?? structuredClone(EMPTY_PROFILE)),
				socialHandles: { ...(current.profile?.socialHandles ?? EMPTY_PROFILE.socialHandles), [key]: value },
			},
		} : current);
	};

	const save = async () => {
		if (!kit) return;
		setSaving(true);
		try {
			const validated = validateBrandKit({ ...kit, updatedAt: Date.now() });
			await saveBrandKit(validated);
			await restoreBrandKitFonts(validated);
			await setActiveBrandKitId(validated.id);
			setKits((current) => [validated, ...current.filter((entry) => entry.id !== validated.id)]);
			onActiveChange(validated);
			onClose();
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : 'The brand profile could not be saved.');
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="logo-brand-kits-overlay">
			<section className="logo-brand-setup-dialog" role="dialog" aria-modal="true" aria-labelledby="logo-brand-setup-title">
				<header className="logo-brand-kits-header">
					<div>
						<p className="eyebrow">ON-DEVICE BRAND PROFILE</p>
						<h2 id="logo-brand-setup-title">Set up brand</h2>
						<p>Contact details and brand assets stay on this device.</p>
					</div>
					<button type="button" onClick={onClose} aria-label="Close brand setup">×</button>
				</header>
				<div className="logo-brand-setup-sources">
					<label className="logo-phase-field">
						<span>Saved kit</span>
						<select value={savedKitId} onChange={(event) => setSavedKitId(event.target.value)}>
							<option value="">Choose a saved kit</option>
							{kits.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
						</select>
					</label>
					<button type="button" onClick={() => void chooseSource('saved')}>Use selected kit</button>
					<button type="button" onClick={() => void chooseSource('project')}>Create from current logo</button>
					<button type="button" onClick={() => void chooseSource('scratch')}>Start from scratch</button>
				</div>
				{error && <p className="logo-phase-error" role="alert">{error}</p>}
				{kit && (
					<div className="logo-brand-setup-form">
						<label className="logo-phase-field">
							<span>Brand name</span>
							<input maxLength={120} value={kit.name} onChange={(event) => setKit({ ...kit, name: event.target.value })} />
						</label>
						{([
							['businessName', 'Business name'],
							['tagline', 'Tagline'],
							['contactName', 'Contact name'],
							['jobTitle', 'Job title'],
							['phone', 'Phone'],
							['email', 'Email'],
							['website', 'Website'],
						] as const).map(([key, label]) => (
							<label className="logo-phase-field" key={key}>
								<span>{label}</span>
								<input
									type={key === 'email' ? 'email' : key === 'website' ? 'url' : 'text'}
									maxLength={key === 'website' ? 2048 : key === 'tagline' ? 240 : 254}
									value={kit.profile?.[key] ?? ''}
									onChange={(event) => updateProfile(key, event.target.value)}
								/>
							</label>
						))}
						<label className="logo-phase-field">
							<span>Address</span>
							<textarea rows={3} maxLength={1000} value={kit.profile?.address ?? ''} onChange={(event) => updateProfile('address', event.target.value)} />
						</label>
						<fieldset className="logo-brand-setup-social">
							<legend>Social handles</legend>
							{([
								['instagram', 'Instagram'],
								['facebook', 'Facebook'],
								['linkedin', 'LinkedIn'],
								['youtube', 'YouTube'],
								['x', 'X'],
							] as const).map(([key, label]) => (
								<label className="logo-phase-field" key={key}>
									<span>{label}</span>
									<input maxLength={200} value={kit.profile?.socialHandles[key] ?? ''} onChange={(event) => updateSocial(key, event.target.value)} />
								</label>
							))}
						</fieldset>
						<div className="logo-brand-setup-fonts">
							<label className="logo-phase-field">
								<span>Heading font</span>
								<input maxLength={100} value={kit.fonts.heading} onChange={(event) => setKit({ ...kit, fonts: { ...kit.fonts, heading: event.target.value } })} />
							</label>
							<label className="logo-phase-field">
								<span>Body font</span>
								<input maxLength={100} value={kit.fonts.body} onChange={(event) => setKit({ ...kit, fonts: { ...kit.fonts, body: event.target.value } })} />
							</label>
						</div>
						<section className="logo-brand-setup-colors" aria-label="Brand colour roles">
							<h3>Assign colour roles</h3>
							{kit.colors.length === 0 && <p className="logo-phase-hint">No logo colours yet. Add colours in the editor and set up this profile again.</p>}
							{kit.colors.map((color, index) => (
								<label className="logo-brand-setup-color" key={`${color.name}-${index}`}>
									<span><i style={{ backgroundColor: color.hex }} />{color.name} <small>{color.hex}</small></span>
									<select
										aria-label={`${color.name} role`}
										value={color.role ?? suggestedRole(color.hex, index)}
										onChange={(event) => setKit({
											...kit,
											colors: kit.colors.map((entry, entryIndex) => entryIndex === index
												? { ...entry, role: event.target.value as BrandColorRole }
												: entry),
										})}
									>
										{COLOR_ROLES.map((role) => <option key={role} value={role}>{role}</option>)}
									</select>
								</label>
							))}
						</section>
						<div className="logo-brand-setup-footer">
							<button type="button" className="logo-phase-primary" disabled={saving} onClick={() => void save()}>{saving ? 'Saving…' : 'Save and use brand'}</button>
						</div>
					</div>
				)}
			</section>
		</div>
	);
}
