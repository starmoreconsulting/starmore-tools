import { useMemo, useState } from 'react';
import SaveToBrandKitButton from './SaveToBrandKitButton';
import { generateBrandSlogans, type BrandTone } from '../strategy/slogans';
import { nextSeed } from '../strategy/random';

const tones: BrandTone[] = ['professional', 'friendly', 'bold', 'luxury', 'playful'];

export default function BrandSloganGenerator() {
	const [businessName, setBusinessName] = useState('');
	const [whatYouDo, setWhatYouDo] = useState('');
	const [whoYouServe, setWhoYouServe] = useState('');
	const [benefit, setBenefit] = useState('');
	const [tone, setTone] = useState<BrandTone>('professional');
	const [seed, setSeed] = useState(510);
	const [editing, setEditing] = useState<Record<string, boolean>>({});
	const [edits, setEdits] = useState<Record<string, string>>({});
	const slogans = useMemo(() => generateBrandSlogans({
		businessName, whatYouDo, whoYouServe, benefit, tone, seed,
	}), [businessName, whatYouDo, whoYouServe, benefit, tone, seed]);

	return (
		<section className="brand-tool-panel">
			<p className="brand-tool-notice"><strong>Starting points only:</strong> check trademarks before using a slogan. Generated wording may resemble existing phrases.</p>
			<div className="brand-tool-fields">
				<label>Business name (optional)<input maxLength={100} value={businessName} onChange={(event) => setBusinessName(event.currentTarget.value)} /></label>
				<label>What you do<input maxLength={100} value={whatYouDo} onChange={(event) => setWhatYouDo(event.currentTarget.value)} /><small>Use a short noun phrase, for example “same-day deliveries”.</small></label>
				<label>Who you serve<input maxLength={100} value={whoYouServe} onChange={(event) => setWhoYouServe(event.currentTarget.value)} /><small>Use a plural group, for example “small businesses”.</small></label>
				<label>One benefit<input maxLength={100} value={benefit} onChange={(event) => setBenefit(event.currentTarget.value)} /><small>Start with a verb: “save time” or “saves you time”.</small></label>
				<label>Tone<select value={tone} onChange={(event) => setTone(event.currentTarget.value as BrandTone)}>{tones.map((value) => <option key={value}>{value}</option>)}</select></label>
			</div>
			<button type="button" className="brand-tool-panel-button" onClick={() => setSeed((current) => nextSeed(current))}>Shuffle slogans</button>
			<p role="status">{slogans.length} slogan{slogans.length === 1 ? '' : 's'} passed the quality checks.{slogans.length < 8 ? ' Try different wording to get more options.' : ''}</p>
			<div className="brand-name-results">
				{slogans.map((slogan) => (
					<article key={`${seed}-${slogan}`} className="brand-name-result">
						{editing[slogan]
							? <textarea aria-label={`Edit slogan ${slogan}`} maxLength={120} value={edits[slogan] ?? slogan} onChange={(event) => setEdits((current) => ({ ...current, [slogan]: event.currentTarget.value }))} />
							: <strong>{edits[slogan] ?? slogan}</strong>}
						<div className="brand-tool-actions">
							<button type="button" onClick={() => setEditing((current) => ({ ...current, [slogan]: !current[slogan] }))}>{editing[slogan] ? 'Done' : 'Edit'}</button>
							<SaveToBrandKitButton updates={{ profile: { tagline: edits[slogan] ?? slogan } }} />
						</div>
					</article>
				))}
			</div>
		</section>
	);
}
