import { useEffect, useMemo, useState } from 'react';
import { get, set } from 'idb-keyval';
import { formatIconName, loadLucideLibrary, type LucideIconNodes } from '../library/icons';
import { loadBrowserFont } from '../library/fonts';
import type { LogoBrief, LogoIndustry, LogoStyle } from '../model/types';
import { generateLogoDesigns, type DesignFilters, type LogoDesign } from '../templates/generator';
import { DesignPreview } from '../templates/DesignPreview';
import { logoLayouts } from '../templates/layouts';

interface Props {
	brief: LogoBrief;
	seed: number;
	onSeedChange: (seed: number) => void;
	onBack: () => void;
	onChoose: (design: LogoDesign) => void;
}

interface Favorite {
	id: string;
	brief: LogoBrief;
	design: LogoDesign;
}

const FAVORITES_KEY = 'logo-studio:template-favorites:v1';
const industries: LogoIndustry[] = ['Technology', 'Business', 'Fashion', 'Construction', 'Food', 'Transport', 'Education', 'Health', 'Creative', 'General'];
const styles: LogoStyle[] = ['Minimalist', 'Modern', 'Corporate', 'Luxury', 'Futuristic', 'Geometric', 'Vintage', 'Elegant', 'Bold', 'Abstract', 'Playful', 'Professional'];

function newSeed(previous: number): number {
	if (globalThis.crypto?.getRandomValues) {
		const values = new Uint32Array(1);
		globalThis.crypto.getRandomValues(values);
		return values[0] === previous ? (previous + 1) >>> 0 : values[0];
	}
	return (previous + 1) >>> 0;
}

export default function GalleryScreen({ brief, seed, onSeedChange, onBack, onChoose }: Props) {
	const [industry, setIndustry] = useState<LogoIndustry | ''>('');
	const [style, setStyle] = useState<LogoStyle | ''>('');
	const [layout, setLayout] = useState('');
	const [page, setPage] = useState(0);
	const [favorites, setFavorites] = useState<Favorite[]>([]);
	const [icons, setIcons] = useState<LucideIconNodes | null>(null);
	const [error, setError] = useState('');
	const filters: DesignFilters = useMemo(() => ({
		...(industry ? { industry } : {}),
		...(style ? { style } : {}),
		...(layout ? { layout } : {}),
	}), [industry, layout, style]);
	const generated = useMemo(() => Array.from({ length: page + 1 }, (_, index) =>
		generateLogoDesigns(brief, { seed, page: index, filters })), [brief, filters, page, seed]);
	const designs = generated.flatMap((result) => result.designs);
	const hasMore = generated[generated.length - 1]?.hasMore ?? false;
	const favoriteIds = useMemo(() => new Set(favorites.map((favorite) => favorite.id)), [favorites]);

	useEffect(() => {
		let active = true;
		void get<unknown>(FAVORITES_KEY).then((value) => {
			if (!active) return;
			if (Array.isArray(value)) {
				setFavorites(value.filter((favorite): favorite is Favorite => (
					typeof favorite === 'object' && favorite !== null
					&& 'id' in favorite && typeof favorite.id === 'string'
					&& 'design' in favorite && 'brief' in favorite
				)));
			}
		}).catch((cause: unknown) => {
			if (active) setError(cause instanceof Error ? `Favourites could not be loaded: ${cause.message}` : 'Favourites could not be loaded from this device.');
		});
		void loadLucideLibrary().then((library) => {
			if (active) setIcons(library.icons);
		}).catch((cause: unknown) => {
			if (active) setError(cause instanceof Error ? cause.message : 'The bundled icon library could not be loaded.');
		});
		return () => { active = false; };
	}, []);

	useEffect(() => {
		const families = new Set(designs.map((design) => design.fontPair.primary));
		void Promise.allSettled([...families].map((family) => loadBrowserFont(family, 700)));
	}, [designs]);

	const updateFilter = (update: () => void) => {
		update();
		setPage(0);
	};
	const toggleFavorite = async (design: LogoDesign) => {
		const next = favoriteIds.has(design.id)
			? favorites.filter((favorite) => favorite.id !== design.id)
			: [{ id: design.id, brief, design }, ...favorites];
		try {
			await set(FAVORITES_KEY, next);
			setFavorites(next);
			setError('');
		} catch (cause) {
			setError(cause instanceof Error ? `Favourite could not be saved: ${cause.message}` : 'Favourite could not be saved on this device.');
		}
	};

	return (
		<section className="logo-gallery-screen" aria-label="Logo design gallery">
			<header className="logo-gallery-header">
				<div><p className="eyebrow">EDITABLE IDEAS FOR {brief.businessName.toLocaleUpperCase()}</p><h2>Choose a design</h2><p>Every preview is an editable SVG design. Select one to open it in the editor.</p></div>
				<div className="logo-gallery-header-actions">
					<button type="button" onClick={onBack}>Edit brief</button>
					<button type="button" onClick={() => { setPage(0); onSeedChange(newSeed(seed)); }}>Shuffle</button>
				</div>
			</header>
			<div className="logo-gallery-filters">
				<label className="logo-phase-field"><span>Industry</span><select value={industry} onChange={(event) => updateFilter(() => setIndustry(event.target.value as LogoIndustry | ''))}><option value="">All industries</option>{industries.map((item) => <option key={item}>{item}</option>)}</select></label>
				<label className="logo-phase-field"><span>Style</span><select value={style} onChange={(event) => updateFilter(() => setStyle(event.target.value as LogoStyle | ''))}><option value="">All styles</option>{styles.map((item) => <option key={item}>{item}</option>)}</select></label>
				<label className="logo-phase-field"><span>Layout</span><select value={layout} onChange={(event) => updateFilter(() => setLayout(event.target.value))}><option value="">All layouts</option>{logoLayouts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
			</div>
			{error && <p className="logo-gallery-error" role="alert">{error}</p>}
			<div className="logo-gallery-grid">
				{designs.map((design) => (
					<article key={design.id} className="logo-gallery-card">
						<button type="button" className="logo-gallery-select" onClick={() => onChoose(design)} aria-label={`Open ${design.name}`}>
							<DesignPreview design={design} icons={icons} />
							<span className="logo-gallery-card-title">{design.name}</span>
							<span className="logo-gallery-card-detail">{design.palette.name} · {design.fontPair.name}{design.icon !== 'none' ? ` · ${formatIconName(design.icon)}` : ''}</span>
						</button>
						<button type="button" className="logo-gallery-favorite" aria-label={`${favoriteIds.has(design.id) ? 'Remove favorite' : 'Add favorite'}: ${design.name}, ${design.palette.name}, ${design.fontPair.name}, ${design.icon}`} aria-pressed={favoriteIds.has(design.id)} onClick={() => void toggleFavorite(design)}>{favoriteIds.has(design.id) ? '♥' : '♡'}</button>
					</article>
				))}
				{designs.length === 0 && <p className="logo-gallery-empty">No designs match these filters. Try another style or layout.</p>}
			</div>
			{hasMore && <button type="button" className="logo-gallery-more" onClick={() => setPage((current) => current + 1)}>Show more designs</button>}
		</section>
	);
}
