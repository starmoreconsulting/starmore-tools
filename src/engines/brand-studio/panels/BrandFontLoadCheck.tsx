import { useEffect, useState } from 'react';
import { bundledBrandFonts } from '../../../data/brand/font-meta';
import { loadBrowserFont } from '../../logo-studio/library/fonts';

interface FontLoadResult {
	family: string;
	weight: number;
	status: 'checking' | 'loaded' | 'failed';
	error?: string;
}

export default function BrandFontLoadCheck() {
	const [results, setResults] = useState<FontLoadResult[]>(() => bundledBrandFonts.flatMap((font) =>
		font.availableWeights.map((weight) => ({ family: font.family, weight, status: 'checking' as const }))));

	useEffect(() => {
		let active = true;
		void Promise.all(results.map(async ({ family, weight }) => {
			try {
				await loadBrowserFont(family, weight);
				const faces = await document.fonts.load(`${weight} 22px "${family}"`, 'Starmore font sample');
				if (faces.length === 0 || !document.fonts.check(`${weight} 22px "${family}"`)) {
					throw new Error('No matching loaded face was returned by the browser.');
				}
				return { family, weight, status: 'loaded' as const };
			} catch (cause) {
				return {
					family,
					weight,
					status: 'failed' as const,
					error: cause instanceof Error ? cause.message : 'Unknown font loading error.',
				};
			}
		})).then((checked) => {
			if (active) setResults(checked);
		});
		return () => { active = false; };
	}, []);

	return (
		<section className="brand-tool-panel">
			<p className="brand-tool-notice">Font check: each sample below is requested from the locally bundled font files. The status uses document.fonts.load and document.fonts.check; a failed entry means the browser could not confirm that exact family and weight.</p>
			<div className="brand-name-results">
				{results.map(({ family, weight, status, error }) => (
					<article key={`${family}-${weight}`} className="brand-name-result">
						<div>
							<strong>{family} · {weight}</strong>
							<p style={{ fontFamily: `"${family}", sans-serif`, fontWeight: weight, fontSize: '22px' }}>Sphinx of black quartz, judge my vow. 0123456789</p>
							<p role={status === 'failed' ? 'alert' : 'status'}>{status === 'loaded' ? 'Loaded successfully' : status === 'failed' ? `FAILED: ${error}` : 'Checking…'}</p>
						</div>
					</article>
				))}
			</div>
		</section>
	);
}
