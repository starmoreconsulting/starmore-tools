import { useEffect, useMemo, useState } from 'react';
import { get, set } from 'idb-keyval';
import { formatIconName, loadLucideLibrary, type LucideIconNodes } from '../library/icons';
import { loadBrowserFont } from '../library/fonts';
import { getShapeGeometry } from '../library/shapes';
import type { Element, LogoBrief, LogoIndustry, LogoStyle } from '../model/types';
import { generateLogoDesigns, type DesignFilters, type LogoDesign } from '../templates/generator';
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

function renderShape(element: Element) {
	const geometry = getShapeGeometry(element);
	const fill = element.shape === 'line' ? 'none' : element.fill ?? '#d7ed79';
	const common = { fill, stroke: element.stroke ?? (element.shape === 'line' ? '#203b32' : 'none'), strokeWidth: element.strokeWidth ?? 0, strokeLinejoin: 'round' as const };
	switch (geometry.tag) {
		case 'rect': return <rect x={geometry.x} y={geometry.y} width={geometry.width} height={geometry.height} rx={geometry.rx} {...common} />;
		case 'ellipse': return <ellipse cx={geometry.cx} cy={geometry.cy} rx={geometry.rx} ry={geometry.ry} {...common} />;
		case 'line': return <line x1={geometry.x1} y1={geometry.y1} x2={geometry.x2} y2={geometry.y2} {...common} />;
		case 'polygon': return <polygon points={geometry.points} {...common} />;
		case 'path': return <path d={geometry.d} fillRule={geometry.fillRule} {...common} />;
	}
}

function renderIcon(element: Element, icons: LucideIconNodes | null) {
	const nodes = element.iconName ? icons?.[element.iconName] : undefined;
	if (!nodes) return null;
	return (
		<svg x="0" y="0" width={element.width} height={element.height} viewBox="0 0 24 24" fill={element.fill ?? 'none'} stroke={element.stroke ?? '#203b32'} strokeWidth={element.strokeWidth ?? 2} strokeLinecap="round" strokeLinejoin="round">
			{nodes.map(([tag, attributes], index) => {
				const props = { key: `${element.id}-${index}` };
				switch (tag) {
					case 'path': return <path {...props} d={String(attributes.d ?? '')} />;
					case 'circle': return <circle {...props} cx={Number(attributes.cx)} cy={Number(attributes.cy)} r={Number(attributes.r)} />;
					case 'ellipse': return <ellipse {...props} cx={Number(attributes.cx)} cy={Number(attributes.cy)} rx={Number(attributes.rx)} ry={Number(attributes.ry)} />;
					case 'line': return <line {...props} x1={Number(attributes.x1)} y1={Number(attributes.y1)} x2={Number(attributes.x2)} y2={Number(attributes.y2)} />;
					case 'polygon': return <polygon {...props} points={String(attributes.points ?? '')} />;
					case 'polyline': return <polyline {...props} points={String(attributes.points ?? '')} />;
					case 'rect': return <rect {...props} x={Number(attributes.x ?? 0)} y={Number(attributes.y ?? 0)} width={Number(attributes.width ?? 0)} height={Number(attributes.height ?? 0)} rx={Number(attributes.rx ?? 0)} />;
					default: return null;
				}
			})}
		</svg>
	);
}

function renderElement(element: Element, icons: LucideIconNodes | null) {
	if (!element.visible) return null;
	let content = null;
	if (element.type === 'shape') content = renderShape(element);
	else if (element.type === 'icon') content = renderIcon(element, icons);
	else if (element.type === 'group') content = (element.children ?? []).map((child) => <g key={child.id}>{renderElement(child, icons)}</g>);
	else if (element.type === 'text') {
		const x = element.align === 'left' ? 0 : element.align === 'right' ? element.width : element.width / 2;
		content = (
			<text x={x} y={element.height / 2} fill={element.fill ?? '#203b32'} fontFamily={element.fontFamily ?? 'Inter'} fontSize={element.fontSize ?? 48} fontWeight={element.fontWeight ?? 400} letterSpacing={element.letterSpacing ?? 0} textAnchor={element.align === 'left' ? 'start' : element.align === 'right' ? 'end' : 'middle'} dominantBaseline="middle">
				{(element.text ?? '').split('\n').map((line, index) => <tspan key={`${element.id}-${index}`} x={x} dy={index === 0 ? 0 : `${element.lineHeight ?? 1.16}em`}>{line}</tspan>)}
			</text>
		);
	}
	return <g transform={`translate(${element.x} ${element.y}) rotate(${element.rotation} ${element.width / 2} ${element.height / 2})`} opacity={element.opacity}>{content}</g>;
}

function DesignPreview({ design, icons }: { design: LogoDesign; icons: LucideIconNodes | null }) {
	return <svg className="logo-gallery-preview" viewBox="0 0 600 600" role="img" aria-label={`${design.name} preview for ${design.elements.find((element) => element.type === 'text')?.text ?? 'business name'}`}>
		{design.elements.map((element) => <g key={element.id}>{renderElement(element, icons)}</g>)}
	</svg>;
}

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
