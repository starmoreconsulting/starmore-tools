import { useEffect, useMemo, useState } from 'react';
import { loadBrowserFont } from '../library/fonts';
import { loadLucideLibrary, type LucideIconNodes } from '../library/icons';
import type { LogoBrief } from '../model/types';
import { getPublishedToolHref } from '../../../data/tools';
import { generateLogoDesigns, seedForBrief } from './generator';
import { DesignPreview } from './DesignPreview';
import type { IndustryTemplateCategory } from './industry-catalog';
import './template-library.css';

function makeSampleBrief(category: IndustryTemplateCategory): LogoBrief {
	return {
		businessName: category.sampleName,
		tagline: category.tagline,
		industry: category.industry,
		description: '',
		style: category.style,
		preferredPalette: 'Blue and silver',
		arrangement: category.arrangement,
	};
}

export default function TemplatePreviewGrid({ category }: { category: IndustryTemplateCategory }) {
	const brief = useMemo(() => makeSampleBrief(category), [category]);
	const designs = useMemo(() => generateLogoDesigns(brief, { seed: seedForBrief(brief) }).designs.slice(0, 12), [brief]);
	const [icons, setIcons] = useState<LucideIconNodes | null>(null);
	const [error, setError] = useState('');
	const logoStudioHref = getPublishedToolHref('/logo-studio/');

	useEffect(() => {
		let active = true;
		void loadLucideLibrary().then(({ icons: loadedIcons }) => {
			if (active) setIcons(loadedIcons);
		}).catch((cause: unknown) => {
			if (active) setError(cause instanceof Error ? cause.message : 'The bundled icon library could not be loaded.');
		});
		void Promise.allSettled([...new Set(designs.map((design) => design.fontPair.primary))].map((family) => loadBrowserFont(family, 700)));
		return () => { active = false; };
	}, [designs]);

	return <section className="template-preview-section" aria-label={`${category.industry} sample logo templates`}>
		<h2>Sample designs for {category.industry.toLowerCase()}</h2>
		<p>These previews use “{category.sampleName}” as a sample brand name. Start in Logo Studio to replace it with your own.</p>
		{error && <p role="alert" className="template-preview-error">{error}</p>}
		<div className="template-preview-grid">
			{designs.map((design) => <article className="template-preview-card" key={design.id}>
				<DesignPreview design={design} icons={icons} />
				<h3>{design.name}</h3>
				<p>{design.palette.name} · {design.fontPair.name}</p>
			</article>)}
		</div>
		{logoStudioHref && <a className="template-preview-cta" href={logoStudioHref}>Make a logo with your own name</a>}
	</section>;
}
