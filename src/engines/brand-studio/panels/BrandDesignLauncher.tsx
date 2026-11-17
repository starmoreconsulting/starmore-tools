import { useState } from 'react';
import type { BrandKit } from '../../logo-studio/brand/kit';
import { getDesignLayouts, generateDesign, type DesignType, type GeneratedDesign } from '../designs/generate';

interface Props {
	kit: BrandKit | null;
	initialType?: DesignType;
	onCreate: (design: GeneratedDesign) => void;
	onSetupBrand: () => void;
	onClose: () => void;
}

const LABELS: Record<DesignType, string> = {
	moodboard: 'Mood board',
	'business-card-front': 'Business card front',
	'business-card-back': 'Business card back',
	letterhead: 'Letterhead',
	envelope: 'Envelope',
	'instagram-post-square': 'Instagram square post',
	'instagram-post-portrait': 'Instagram 4:5 post',
	'instagram-story': 'Instagram story',
	'facebook-cover': 'Facebook cover',
	'youtube-banner': 'YouTube banner',
	'linkedin-banner': 'LinkedIn banner',
};

export default function BrandDesignLauncher({ kit, initialType, onCreate, onSetupBrand, onClose }: Props) {
	const [type, setType] = useState<DesignType>(initialType ?? 'business-card-front');
	const [layoutId, setLayoutId] = useState(getDesignLayouts(initialType ?? 'business-card-front')[0]);
	const [cardSize, setCardSize] = useState<'85x55mm' | '3.5x2in'>('85x55mm');
	const [imageCount, setImageCount] = useState(6);
	const [keywords, setKeywords] = useState('');
	const [error, setError] = useState('');
	const create = () => {
		if (!kit) {
			setError('Set up or activate a brand kit before generating a design.');
			return;
		}
		try {
			onCreate(generateDesign(type, layoutId, kit, kit.profile, { cardSize, imageCount, keywords }));
			setError('');
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : 'The brand design could not be generated.');
		}
	};

	return (
		<div className="logo-brand-kits-overlay">
			<section className="logo-brand-setup-dialog" role="dialog" aria-modal="true" aria-labelledby="brand-design-launcher-title">
				<header className="logo-brand-kits-header">
					<div>
						<p className="eyebrow">BRAND STUDIO</p>
						<h2 id="brand-design-launcher-title">Create a brand design</h2>
						<p>{kit ? `Using ${kit.name}. Your project stays on this device.` : 'Choose a saved brand kit or set one up first.'}</p>
					</div>
					<button type="button" onClick={onClose} aria-label="Close design launcher">×</button>
				</header>
				<div className="logo-brand-setup-form">
					<label className="logo-phase-field">
						<span>Design type</span>
						<select value={type} onChange={(event) => {
							const next = event.target.value as DesignType;
							setType(next);
							setLayoutId(getDesignLayouts(next)[0]);
						}}>
							{Object.entries(LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
						</select>
					</label>
					<label className="logo-phase-field">
						<span>Layout</span>
						<select value={layoutId} onChange={(event) => setLayoutId(event.target.value)}>
							{getDesignLayouts(type).map((layout) => <option key={layout} value={layout}>{layout.replaceAll('-', ' ')}</option>)}
						</select>
					</label>
					{type.startsWith('business-card') && <label className="logo-phase-field">
						<span>Card size</span>
						<select value={cardSize} onChange={(event) => setCardSize(event.target.value as typeof cardSize)}>
							<option value="85x55mm">85 × 55 mm</option>
							<option value="3.5x2in">3.5 × 2 in</option>
						</select>
					</label>}
					{type === 'moodboard' && <>
						<label className="logo-phase-field">
							<span>Image cells</span>
							<select value={imageCount} onChange={(event) => setImageCount(Number(event.target.value))}>
								{Array.from({ length: 7 }, (_, index) => index + 3).map((count) => <option key={count} value={count}>{count} images</option>)}
							</select>
						</label>
						<label className="logo-phase-field">
							<span>Keywords, separated by commas</span>
							<input maxLength={160} value={keywords} onChange={(event) => setKeywords(event.target.value)} placeholder="calm, handmade, outdoors" />
						</label>
					</>}
				</div>
				{!kit && <div className="logo-brand-setup-footer">
					<button type="button" className="logo-phase-primary" onClick={onSetupBrand}>Set up brand</button>
				</div>}
				{error && <p className="logo-phase-error" role="alert">{error}</p>}
				<div className="logo-brand-setup-footer">
					<button type="button" className="logo-phase-primary" disabled={!kit} onClick={create}>Open in editor</button>
				</div>
			</section>
		</div>
	);
}
