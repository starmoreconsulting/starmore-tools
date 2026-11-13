import { useEffect, useState } from 'react';
import type { Element, LogoProject } from '../model/types';
import { loadLucideLibrary, type LucideIconNodes } from '../library/icons';
import { DesignPreview } from '../templates/DesignPreview';
import type { LogoDesign } from '../templates/generator';
import { variantLabel } from '../variants/automatic';

interface Props {
	project: LogoProject;
	onClose: () => void;
}

function previewDesign(name: string, elements: Element[]): LogoDesign {
	return {
		id: name,
		name: variantLabel(name),
		layoutId: name,
		palette: { name: 'Preview', colors: ['#111111', '#ffffff', '#737373', '#d9d9d9'] },
		fontPair: { name: 'Preview', primary: 'Inter', secondary: 'Inter' },
		icon: '',
		weight: 400,
		letterSpacing: 0,
		score: 0,
		elements,
	};
}

export default function CompareVariants({ project, onClose }: Props) {
	const [icons, setIcons] = useState<LucideIconNodes | null>(null);
	const [iconError, setIconError] = useState('');
	useEffect(() => {
		let active = true;
		void loadLucideLibrary().then(({ icons: loaded }) => {
			if (active) setIcons(loaded);
		}).catch((cause: unknown) => {
			if (!active) return;
			setIcons({});
			setIconError(cause instanceof Error ? cause.message : 'Local icon previews could not be loaded.');
		});
		return () => { active = false; };
	}, []);

	return (
		<div className="logo-export-overlay" onMouseDown={(event) => {
			if (event.target === event.currentTarget) onClose();
		}}>
			<section className="logo-compare-dialog" role="dialog" aria-modal="true" aria-labelledby="logo-compare-title">
				<header className="logo-compare-header">
					<div><p className="eyebrow">DESIGN REVIEW</p><h2 id="logo-compare-title">Compare variants</h2></div>
					<button type="button" onClick={onClose} aria-label="Close variant comparison">×</button>
				</header>
				{iconError && <p className="logo-gallery-error" role="alert">{iconError}</p>}
				<div className="logo-compare-grid">
					{Object.entries(project.variants).map(([name, elements]) => (
						<article key={name} className="logo-compare-card">
							<h3>{variantLabel(name)}</h3>
							<div className="logo-compare-backgrounds">
								<div className="logo-compare-preview is-light" aria-label={`${variantLabel(name)} on light background`}>
									<DesignPreview design={previewDesign(name, elements)} icons={icons} background="#ffffff" />
								</div>
								<div className="logo-compare-preview is-dark" aria-label={`${variantLabel(name)} on dark background`}>
									<DesignPreview design={previewDesign(name, elements)} icons={icons} background="#202020" />
								</div>
							</div>
						</article>
					))}
				</div>
			</section>
		</div>
	);
}
