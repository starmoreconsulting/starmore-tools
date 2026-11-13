import { useEffect, useMemo, useRef, useState } from 'react';
import { loadBrowserFont, logoFonts, type LogoFontCategory } from '../library/fonts';
import type { Element } from '../model/types';

const categories: { id: 'all' | LogoFontCategory; label: string }[] = [
	{ id: 'all', label: 'All' },
	{ id: 'sans', label: 'Sans' },
	{ id: 'serif', label: 'Serif' },
	{ id: 'display', label: 'Display' },
	{ id: 'script', label: 'Script' },
	{ id: 'rounded', label: 'Rounded' },
	{ id: 'condensed', label: 'Condensed' },
];

const pairings = [
	['Inter', 'Playfair Display'], ['Montserrat', 'Lora'], ['Oswald', 'Merriweather'],
	['Bebas Neue', 'Raleway'], ['DM Sans', 'DM Serif Display'], ['Manrope', 'Cormorant Garamond'],
	['Nunito', 'Bodoni Moda'], ['Roboto Condensed', 'Libre Baskerville'], ['Anton', 'Open Sans'],
	['Quicksand', 'Roboto Slab'], ['Dancing Script', 'Work Sans'], ['Archivo Black', 'Source Sans 3'],
] as const;

interface Props {
	element: Element | null;
	onUpdate: (patch: Partial<Element>) => void;
}

function FontPreview({ family, text, selected, disabled, onSelect }: {
	family: string;
	text: string;
	selected: boolean;
	disabled: boolean;
	onSelect: () => void;
}) {
	const ref = useRef<HTMLButtonElement>(null);
	const [loaded, setLoaded] = useState(false);
	const [failed, setFailed] = useState(false);

	useEffect(() => {
		const target = ref.current;
		if (!target) return undefined;
		let active = true;
		const load = () => {
			void loadBrowserFont(family, 400).then(() => {
				if (active) setLoaded(true);
			}).catch(() => {
				if (active) setFailed(true);
			});
		};
		if (!('IntersectionObserver' in window)) {
			load();
			return () => { active = false; };
		}
		const observer = new IntersectionObserver((entries) => {
			if (entries.some((entry) => entry.isIntersecting)) {
				observer.disconnect();
				load();
			}
		});
		observer.observe(target);
		return () => {
			active = false;
			observer.disconnect();
		};
	}, [family]);

	return (
		<button ref={ref} type="button" className="logo-font-card" aria-pressed={selected} disabled={disabled} onClick={onSelect}>
			<span className="logo-font-name">{family}</span>
			<span className="logo-font-sample" style={{ fontFamily: loaded ? `"${family}"` : 'inherit' }}>{text}</span>
			{failed && <span className="logo-font-warning">Preview unavailable</span>}
			{!loaded && !failed && <span className="logo-font-loading">Preview loads when visible</span>}
		</button>
	);
}

export default function FontBrowser({ element, onUpdate }: Props) {
	const [category, setCategory] = useState<'all' | LogoFontCategory>('all');
	const [sample, setSample] = useState('Your brand');
	const fontGroups = useMemo(() => (
		categories.filter((item) => item.id !== 'all' && (category === 'all' || category === item.id))
			.map((item) => ({
				category: item,
				fonts: logoFonts.filter((font) => font.category === item.id),
			}))
	), [category]);
	const canApply = element?.type === 'text';

	return (
		<section className="logo-library-section" aria-label="Font browser">
			<label className="logo-phase-field">
				<span>Preview text</span>
				<input value={sample} onChange={(event) => setSample(event.target.value)} maxLength={50} />
			</label>
			<div className="logo-library-filter-row" aria-label="Font categories">
				{categories.map((item) => <button key={item.id} type="button" aria-pressed={category === item.id} onClick={() => setCategory(item.id)}>{item.label}</button>)}
			</div>
			{!canApply && <p className="logo-phase-hint">Select a text element to change its font.</p>}
			{fontGroups.map(({ category: group, fonts }) => (
				<section key={group.id} aria-label={`${group.label} fonts`}>
					<h3 className="logo-library-subheading">{group.label}</h3>
					<div className="logo-font-list">
						{fonts.map((font) => (
							<FontPreview
								key={font.family}
								family={font.family}
								text={sample || 'Sample'}
								selected={element?.fontFamily === font.family}
								disabled={!canApply}
								onSelect={() => onUpdate({ fontFamily: font.family })}
							/>
						))}
					</div>
				</section>
			))}
			<h3 className="logo-library-subheading">Recommended pairings</h3>
			<div className="logo-font-pairings">
				{pairings.map(([first, second]) => (
					<button key={`${first}-${second}`} type="button" disabled={!canApply} onClick={() => {
						if (canApply) onUpdate({ fontFamily: first });
					}}>
						<span>{first}</span><span>{second}</span>
					</button>
				))}
			</div>
			<p className="logo-phase-hint">Font previews and outlines use bundled WOFF files and load only when needed.</p>
		</section>
	);
}
