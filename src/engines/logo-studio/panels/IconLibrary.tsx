import { useEffect, useMemo, useState } from 'react';
import { createDefaultElement, type Element } from '../model/types';
import { formatIconName, loadLucideLibrary, matchesIconCategory, type LucideIconNodes } from '../library/icons';

const categories = ['All', 'Symbols', 'Nature', 'Objects', 'Arrows', 'Business'] as const;

interface Props {
	onAdd: (element: Element) => void;
}

function IconPreview({ name, nodes }: { name: string; nodes: LucideIconNodes[string] }) {
	return (
		<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
			{nodes.map(([tag, attributes], index) => {
				const key = `${name}-${index}`;
				switch (tag) {
					case 'path': return <path key={key} d={String(attributes.d ?? '')} />;
					case 'circle': return <circle key={key} cx={Number(attributes.cx)} cy={Number(attributes.cy)} r={Number(attributes.r)} />;
					case 'ellipse': return <ellipse key={key} cx={Number(attributes.cx)} cy={Number(attributes.cy)} rx={Number(attributes.rx)} ry={Number(attributes.ry)} />;
					case 'line': return <line key={key} x1={Number(attributes.x1)} y1={Number(attributes.y1)} x2={Number(attributes.x2)} y2={Number(attributes.y2)} />;
					case 'polygon': return <polygon key={key} points={String(attributes.points ?? '')} />;
					case 'polyline': return <polyline key={key} points={String(attributes.points ?? '')} />;
					case 'rect': return <rect key={key} x={Number(attributes.x ?? 0)} y={Number(attributes.y ?? 0)} width={Number(attributes.width ?? 0)} height={Number(attributes.height ?? 0)} rx={Number(attributes.rx ?? 0)} />;
					default: return null;
				}
			})}
		</svg>
	);
}

export default function IconLibrary({ onAdd }: Props) {
	const [library, setLibrary] = useState<{ icons: LucideIconNodes; tags: Record<string, string[]> } | null>(null);
	const [query, setQuery] = useState('');
	const [category, setCategory] = useState<string>('All');
	const [error, setError] = useState('');

	useEffect(() => {
		let active = true;
		void loadLucideLibrary().then((result) => {
			if (active) setLibrary(result);
		}).catch((cause: unknown) => {
			if (active) setError(cause instanceof Error ? cause.message : 'The local icon library could not be loaded.');
		});
		return () => { active = false; };
	}, []);

	const iconNames = useMemo(() => {
		if (!library) return [];
		const normalizedQuery = query.trim().toLowerCase();
		return Object.keys(library.icons).filter((name) => {
			const tags = library.tags[name] ?? [];
			return (!normalizedQuery || `${name} ${tags.join(' ')}`.toLowerCase().includes(normalizedQuery))
				&& matchesIconCategory(name, tags, category);
		}).slice(0, 240);
	}, [category, library, query]);

	return (
		<section className="logo-library-section" aria-label="Icon library">
			<label className="logo-phase-field">
				<span>Search 2,000+ icons</span>
				<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search icons" />
			</label>
			<div className="logo-library-filter-row" aria-label="Icon categories">
				{categories.map((item) => (
					<button key={item} type="button" aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>
				))}
			</div>
			{error && <p className="logo-phase-error" role="alert">{error}</p>}
			{!library && !error && <p className="logo-phase-hint">Loading bundled icons…</p>}
			{library && (
				<div className="logo-icon-grid">
					{iconNames.map((name) => (
						<button
							key={name}
							type="button"
							title={`Add ${formatIconName(name)}`}
							aria-label={`Add ${formatIconName(name)} icon`}
							onClick={() => onAdd(createDefaultElement('icon', {
								iconName: name,
								x: 252,
								y: 252,
								width: 96,
								height: 96,
								fill: 'none',
								stroke: '#203b32',
								strokeWidth: 2,
							}))}
						>
							<IconPreview name={name} nodes={library.icons[name]} />
							<span>{formatIconName(name)}</span>
						</button>
					))}
				</div>
			)}
			{library && iconNames.length === 0 && <p className="logo-phase-hint">No icons match this search.</p>}
			{library && iconNames.length === 240 && <p className="logo-phase-hint">Refine your search to see more results.</p>}
		</section>
	);
}
