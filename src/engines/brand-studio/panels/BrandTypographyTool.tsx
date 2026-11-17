import { useEffect, useMemo, useState } from 'react';
import { bundledBrandFonts, curatedFontPairings, getGeneratedFontPairings } from '../../../data/brand/font-meta';
import { loadBrowserFont } from '../../logo-studio/library/fonts';
import SaveToBrandKitButton from './SaveToBrandKitButton';
import { nextSeed } from '../strategy/random';

export default function BrandTypographyTool() {
	const [seed, setSeed] = useState(247);
	const generated = useMemo(() => getGeneratedFontPairings(seed), [seed]);
	const pairs = useMemo(() => [
		...curatedFontPairings.map((pair, index) => ({ ...pair, id: `curated-${index}` })),
		...generated.map((pair, index) => ({ ...pair, id: `generated-${index}` })),
	], [generated]);
	const [pairId, setPairId] = useState('curated-0');
	const pair = pairs.find((entry) => entry.id === pairId) ?? pairs[0];
	const [businessName, setBusinessName] = useState('Your business name');
	const [tagline, setTagline] = useState('A short line that captures your promise');
	const [bodyText, setBodyText] = useState('Use this paragraph to preview how a longer block of copy reads in the selected type pairing. Check spacing and legibility at the size you plan to use.');
	const [headingWeight, setHeadingWeight] = useState(700);
	const [bodyWeight, setBodyWeight] = useState(400);
	const [headingSize, setHeadingSize] = useState(42);
	const [bodySize, setBodySize] = useState(16);
	const [lineHeight, setLineHeight] = useState(1.5);
	const [status, setStatus] = useState('');
	const [error, setError] = useState('');

	const fontByName = useMemo(() => new Map(bundledBrandFonts.map((font) => [font.family, font])), []);
	const headingMeta = fontByName.get(pair.heading);
	const subheadingMeta = fontByName.get(pair.subheading);
	const bodyMeta = fontByName.get(pair.body);
	const headingWeights = headingMeta?.availableWeights ?? [400];
	const bodyWeights = bodyMeta?.availableWeights ?? [400];
	const resolvedHeadingWeight = headingWeights.includes(headingWeight) ? headingWeight : headingWeights[0];
	const resolvedBodyWeight = bodyWeights.includes(bodyWeight) ? bodyWeight : bodyWeights[0];

	useEffect(() => {
		let active = true;
		void Promise.all([
			loadBrowserFont(pair.heading, resolvedHeadingWeight),
			loadBrowserFont(pair.subheading, 400),
			loadBrowserFont(pair.body, resolvedBodyWeight),
		]).then(() => {
			if (active) setError('');
		}).catch((cause: unknown) => {
			if (active) setError(cause instanceof Error ? `Could not load a bundled font preview: ${cause.message}` : 'Could not load a bundled font preview.');
		});
		return () => { active = false; };
	}, [pair.heading, pair.subheading, pair.body, resolvedHeadingWeight, resolvedBodyWeight]);

	const css = `:root {\n  --brand-heading: "${pair.heading}", sans-serif;\n  --brand-subheading: "${pair.subheading}", sans-serif;\n  --brand-body: "${pair.body}", sans-serif;\n}\n.brand-heading { font-family: var(--brand-heading); font-weight: ${resolvedHeadingWeight}; font-size: ${headingSize}px; }\n.brand-subheading { font-family: var(--brand-subheading); }\n.brand-body { font-family: var(--brand-body); font-weight: ${resolvedBodyWeight}; font-size: ${bodySize}px; line-height: ${lineHeight}; }`;
	const exportText = `Heading: ${pair.heading}\nSubheading: ${pair.subheading}\nBody: ${pair.body}\n\n${css}\n`;

	async function copyExport() {
		setError('');
		try {
			await navigator.clipboard.writeText(exportText);
			setStatus('Font names and CSS copied.');
		} catch (cause) {
			setError(cause instanceof Error ? `Could not copy: ${cause.message}` : 'Clipboard access is unavailable in this browser.');
		}
	}

	function downloadExport() {
		const url = URL.createObjectURL(new Blob([exportText], { type: 'text/css' }));
		const anchor = document.createElement('a');
		anchor.href = url;
		anchor.download = 'brand-typography.css';
		anchor.click();
		URL.revokeObjectURL(url);
		setStatus('Font names and CSS downloaded.');
	}

	return (
		<section className="brand-tool-panel">
			<div className="brand-tool-fields">
				<label>Font pairing<select value={pair.id} onChange={(event) => setPairId(event.currentTarget.value)}>{pairs.map((entry) => <option key={entry.id} value={entry.id}>{entry.name} — {entry.heading} / {entry.subheading} / {entry.body}</option>)}</select></label>
				<label>Business name<input maxLength={120} value={businessName} onChange={(event) => setBusinessName(event.currentTarget.value)} /></label>
				<label>Tagline<input maxLength={240} value={tagline} onChange={(event) => setTagline(event.currentTarget.value)} /></label>
				<label>Preview paragraph<textarea maxLength={1000} value={bodyText} onChange={(event) => setBodyText(event.currentTarget.value)} /></label>
			</div>
			<div className="brand-tool-fields">
				<label>Heading weight<select value={resolvedHeadingWeight} onChange={(event) => setHeadingWeight(Number(event.currentTarget.value))}>{headingWeights.map((weight) => <option key={weight} value={weight}>{weight}</option>)}</select></label>
				<label>Body weight<select value={resolvedBodyWeight} onChange={(event) => setBodyWeight(Number(event.currentTarget.value))}>{bodyWeights.map((weight) => <option key={weight} value={weight}>{weight}</option>)}</select></label>
				<label>Heading size: {headingSize}px<input type="range" min="20" max="72" value={headingSize} onChange={(event) => setHeadingSize(Number(event.currentTarget.value))} /></label>
				<label>Body size: {bodySize}px<input type="range" min="12" max="28" value={bodySize} onChange={(event) => setBodySize(Number(event.currentTarget.value))} /></label>
				<label>Line height: {lineHeight.toFixed(1)}<input type="range" min="1" max="2" step="0.1" value={lineHeight} onChange={(event) => setLineHeight(Number(event.currentTarget.value))} /></label>
			</div>
			<section className="brand-type-preview" aria-label="Typography preview">
				<h2 style={{ fontFamily: `"${pair.heading}", sans-serif`, fontWeight: resolvedHeadingWeight, fontSize: `${headingSize}px` }}>{businessName || 'Your business name'}</h2>
				<h3 style={{ fontFamily: `"${pair.subheading}", sans-serif` }}>{tagline || 'Your tagline'}</h3>
				<p style={{ fontFamily: `"${pair.body}", sans-serif`, fontWeight: resolvedBodyWeight, fontSize: `${bodySize}px`, lineHeight }}>{bodyText}</p>
			</section>
			<div className="brand-tool-actions">
				<button type="button" onClick={() => setSeed((current) => nextSeed(current))}>Shuffle generated pairs</button>
				<button type="button" onClick={() => void copyExport()}>Copy font names and CSS</button>
				<button type="button" onClick={downloadExport}>Download CSS</button>
				<SaveToBrandKitButton updates={{ fonts: { heading: pair.heading, subheading: pair.subheading, body: pair.body } }} />
			</div>
			{error && <p role="alert">{error}</p>}
			{status && <p role="status">{status}</p>}
			<section className="brand-strategy-result">
				<h2>Bundled font licences</h2>
				{[headingMeta, subheadingMeta, bodyMeta].map((font) => font && (
					<p key={font.family}><strong>{font.family}</strong> — {font.license}. Weights: {font.availableWeights.join(', ')}.</p>
				))}
				<p>All choices are bundled locally; uploaded or remotely hosted fonts are not included here.</p>
			</section>
		</section>
	);
}
