import { useEffect, useMemo, useState } from 'react';
import { getPublishedToolHref } from '../../../data/tools';
import type { LogoIndustry, LogoStyle } from '../../logo-studio/model/types';
import SaveToBrandKitButton from './SaveToBrandKitButton';
import { listFavoriteNames, toggleFavoriteName } from '../strategy/favorites';
import { generateBrandNames, type NameLength } from '../strategy/names';
import { nextSeed } from '../strategy/random';

const industries: LogoIndustry[] = ['Technology', 'Business', 'Fashion', 'Construction', 'Food', 'Transport', 'Education', 'Health', 'Creative', 'General'];
const styles: LogoStyle[] = ['Minimalist', 'Modern', 'Corporate', 'Luxury', 'Futuristic', 'Geometric', 'Vintage', 'Elegant', 'Bold', 'Abstract', 'Playful', 'Professional'];
const logoStudioHref = getPublishedToolHref('/logo-studio/');

export default function BrandNameGenerator() {
	const [keywordsText, setKeywordsText] = useState('');
	const [industry, setIndustry] = useState<LogoIndustry>('General');
	const [style, setStyle] = useState<LogoStyle>('Modern');
	const [length, setLength] = useState<NameLength>('balanced');
	const [startingLetter, setStartingLetter] = useState('');
	const [seed, setSeed] = useState(741);
	const [visibleCount, setVisibleCount] = useState(24);
	const [favorites, setFavorites] = useState<string[]>([]);
	const [error, setError] = useState('');

	useEffect(() => {
		void listFavoriteNames().then(setFavorites).catch((cause: unknown) => {
			setError(cause instanceof Error ? cause.message : 'Could not load saved names.');
		});
	}, []);

	const names = useMemo(() => generateBrandNames({
		keywords: keywordsText.split(/[,\n]/),
		industry,
		style,
		length,
		startingLetter,
		seed,
		count: visibleCount,
	}), [keywordsText, industry, style, length, startingLetter, seed, visibleCount]);

	async function toggleFavorite(name: string) {
		setError('');
		try {
			setFavorites(await toggleFavoriteName(name));
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : 'Could not update saved names.');
		}
	}

	function tryInLogoStudio(name: string) {
		if (!logoStudioHref) {
			setError('Logo Studio is not currently published.');
			return;
		}
		window.location.assign(`${logoStudioHref}?name=${encodeURIComponent(name)}`);
	}

	return (
		<section className="brand-tool-panel">
			<p className="brand-tool-notice"><strong>Suggestions only:</strong> a name may already be in use. Check trademarks and domain names before using one.</p>
			<div className="brand-tool-fields">
				<label>Keywords (up to 5)<textarea value={keywordsText} onChange={(event) => setKeywordsText(event.currentTarget.value)} placeholder="Separate keywords with commas" /></label>
				<label>Industry<select value={industry} onChange={(event) => setIndustry(event.currentTarget.value as LogoIndustry)}>{industries.map((value) => <option key={value}>{value}</option>)}</select></label>
				<label>Style<select value={style} onChange={(event) => setStyle(event.currentTarget.value as LogoStyle)}>{styles.map((value) => <option key={value}>{value}</option>)}</select></label>
				<label>Length preference<select value={length} onChange={(event) => setLength(event.currentTarget.value as NameLength)}><option value="short">Short</option><option value="balanced">Balanced</option><option value="long">Long</option></select></label>
				<label>Starting letter (optional)<input maxLength={2} value={startingLetter} onChange={(event) => setStartingLetter(Array.from(event.currentTarget.value)[0] ?? '')} /></label>
			</div>
			<div className="brand-tool-actions">
				<button type="button" onClick={() => { setSeed((current) => nextSeed(current)); setVisibleCount(24); }}>Shuffle</button>
			</div>
			<p className="brand-tool-notice">These generated names are starting points, not cleared business names. Check trademark and domain availability yourself.</p>
			{error && <p role="alert">{error}</p>}
			<div className="brand-name-results">
				{names.map((name) => (
					<article key={`${seed}-${name}`} className="brand-name-result">
						<strong>{name}</strong>
						<div className="brand-tool-actions">
							<button type="button" aria-label={`${favorites.includes(name) ? 'Remove' : 'Add'} ${name} ${favorites.includes(name) ? 'from' : 'to'} favorites`} aria-pressed={favorites.includes(name)} onClick={() => void toggleFavorite(name)}>{favorites.includes(name) ? '♥' : '♡'}</button>
							<SaveToBrandKitButton updates={{ profile: { businessName: name } }} />
							<button type="button" disabled={!logoStudioHref} onClick={() => tryInLogoStudio(name)}>Try in Logo Studio</button>
						</div>
					</article>
				))}
			</div>
			<button type="button" onClick={() => setVisibleCount((current) => current + 24)}>Show more</button>
		</section>
	);
}
