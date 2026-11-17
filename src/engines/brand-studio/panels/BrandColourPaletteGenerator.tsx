import { useMemo, useState } from 'react';
import { industryRules, styleRules } from '../../logo-studio/templates/rules';
import type { LogoIndustry, LogoStyle } from '../../logo-studio/model/types';
import { logoPalettes } from '../../logo-studio/library/palettes';
import SaveToBrandKitButton from './SaveToBrandKitButton';
import {
	assignPaletteRoles,
	getContrastPairs,
	hexToHsl,
	hslToHex,
	paletteHasNoAccessibleText,
	type Harmony,
	type PaletteColor,
} from '../colour/math';
import { nextSeed } from '../strategy/random';

const industries = Object.keys(industryRules) as LogoIndustry[];
const styles = Object.keys(styleRules) as LogoStyle[];
const harmonies: Harmony[] = ['complementary', 'analogous', 'triadic', 'split-complementary', 'monochrome'];
const roleLabels = ['primary', 'secondary', 'accent', 'light', 'dark'] as const;

function suggestedColor(industry: LogoIndustry, style: LogoStyle): string {
	const paletteName = styleRules[style].palettes[0];
	const source = logoPalettes.find((palette) => palette.name === paletteName)?.colors[0] ?? '#356B54';
	const hsl = hexToHsl(source);
	const industryShift = industries.indexOf(industry) * 7;
	return hslToHex({ ...hsl, h: hsl.h + industryShift });
}

function downloadFile(filename: string, contents: Blob): void {
	const url = URL.createObjectURL(contents);
	const anchor = document.createElement('a');
	anchor.href = url;
	anchor.download = filename;
	anchor.click();
	URL.revokeObjectURL(url);
}

async function createSwatchPng(colors: PaletteColor[]): Promise<Blob> {
	const canvas = document.createElement('canvas');
	canvas.width = 1200;
	canvas.height = 360;
	const context = canvas.getContext('2d');
	if (!context) throw new Error('Your browser could not prepare the palette swatch image.');
	context.fillStyle = '#FFFFFF';
	context.fillRect(0, 0, canvas.width, canvas.height);
	const width = canvas.width / colors.length;
	colors.forEach(({ hex, role }, index) => {
		context.fillStyle = hex;
		context.fillRect(index * width, 0, width, canvas.height - 70);
		context.fillStyle = '#202B25';
		context.font = '24px sans-serif';
		context.fillText(role, index * width + 14, canvas.height - 38);
		context.fillText(hex, index * width + 14, canvas.height - 12);
	});
	return new Promise((resolve, reject) => canvas.toBlob((blob) => {
		canvas.width = 0;
		canvas.height = 0;
		if (blob) resolve(blob);
		else reject(new Error('Your browser could not encode the palette swatch PNG.'));
	}, 'image/png'));
}

export default function BrandColourPaletteGenerator() {
	const [mode, setMode] = useState<'seed' | 'rules'>('seed');
	const [seedColor, setSeedColor] = useState('#356B54');
	const [industry, setIndustry] = useState<LogoIndustry>('General');
	const [style, setStyle] = useState<LogoStyle>('Modern');
	const [harmony, setHarmony] = useState<Harmony>('analogous');
	const [seed, setSeed] = useState(73);
	const [locks, setLocks] = useState<Record<string, string>>({});
	const [status, setStatus] = useState('');
	const [error, setError] = useState('');

	const validSeedColor = /^#[\da-f]{6}$/i.test(seedColor);
	const baseColor = mode === 'seed'
		? validSeedColor ? seedColor : '#356B54'
		: suggestedColor(industry, style);
	const palette = useMemo(() => assignPaletteRoles(baseColor, harmony, seed).map((color) => ({
		...color,
		hex: locks[color.role] ?? color.hex,
	})), [baseColor, harmony, seed, locks]);
	const contrastPairs = useMemo(() => getContrastPairs(palette), [palette]);

	function shuffle() {
		setSeed((current) => nextSeed(current));
		setStatus('');
	}

	function toggleLock(color: PaletteColor) {
		setLocks((current) => {
			const next = { ...current };
			if (next[color.role]) delete next[color.role];
			else next[color.role] = color.hex;
			return next;
		});
	}

	async function copy(value: string) {
		setError('');
		try {
			await navigator.clipboard.writeText(value);
			setStatus('Copied to clipboard.');
		} catch (cause) {
			setError(cause instanceof Error ? `Could not copy: ${cause.message}` : 'Clipboard access is unavailable in this browser.');
		}
	}

	async function exportPng() {
		setError('');
		try {
			downloadFile('brand-colour-swatches.png', await createSwatchPng(palette));
			setStatus('Swatch PNG downloaded.');
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : 'Could not create the swatch PNG.');
		}
	}

	const json = JSON.stringify(palette, null, 2);
	const css = `:root {\n${palette.map(({ role, hex }) => `  --brand-${role}: ${hex};`).join('\n')}\n}`;
	const noAccessibleText = paletteHasNoAccessibleText(palette);

	return (
		<section className="brand-tool-panel">
			<div className="brand-tool-fields">
				<label>Palette source<select value={mode} onChange={(event) => setMode(event.currentTarget.value as 'seed' | 'rules')}><option value="seed">Seed colour</option><option value="rules">Industry and style</option></select></label>
				{mode === 'seed' ? (
					<label>Seed HEX colour<input value={seedColor} onChange={(event) => setSeedColor(event.currentTarget.value)} /><input aria-label="Choose seed colour" type="color" value={/^#[\da-f]{6}$/i.test(seedColor) ? seedColor : '#356B54'} onChange={(event) => setSeedColor(event.currentTarget.value)} /></label>
				) : <>
					<label>Industry<select value={industry} onChange={(event) => setIndustry(event.currentTarget.value as LogoIndustry)}>{industries.map((value) => <option key={value}>{value}</option>)}</select></label>
					<label>Style<select value={style} onChange={(event) => setStyle(event.currentTarget.value as LogoStyle)}>{styles.map((value) => <option key={value}>{value}</option>)}</select></label>
				</>}
				<label>Harmony<select value={harmony} onChange={(event) => setHarmony(event.currentTarget.value as Harmony)}>{harmonies.map((value) => <option key={value}>{value}</option>)}</select></label>
			</div>
			<div className="brand-tool-actions">
				<button type="button" onClick={shuffle}>Shuffle unlocked colours</button>
				<button type="button" onClick={() => void copy(palette.map((color) => color.hex).join('\n'))}>Copy HEX values</button>
				<button type="button" onClick={() => void copy(css)}>Copy CSS variables</button>
				<button type="button" onClick={() => downloadFile('brand-colour-palette.json', new Blob([json], { type: 'application/json' }))}>Download JSON</button>
				<button type="button" onClick={() => void exportPng()}>Download swatch PNG</button>
				<SaveToBrandKitButton updates={{ colors: palette.map(({ role, hex }) => ({ role, hex, name: roleLabels.find((label) => label === role) ?? role })) }} />
			</div>
			{noAccessibleText && <p className="brand-tool-notice" role="alert">Warning: this palette has a colour with no black or white text option that meets WCAG AA. Adjust the colour before using text on it.</p>}
			{mode === 'seed' && !validSeedColor && <p className="brand-tool-notice" role="alert">Enter a valid six-digit HEX colour, such as #356B54.</p>}
			{error && <p role="alert">{error}</p>}
			{status && <p role="status">{status}</p>}
			<div className="brand-palette-swatches">
				{palette.map((color) => (
					<article key={color.role} className="brand-palette-swatch">
						<div style={{ backgroundColor: color.hex }} />
						<strong>{color.role}</strong>
						<code>{color.hex}</code>
						<button type="button" aria-pressed={Boolean(locks[color.role])} onClick={() => toggleLock(color)}>{locks[color.role] ? 'Unlock' : 'Lock'} {color.role}</button>
					</article>
				))}
			</div>
			<section className="brand-strategy-result">
				<h2>Text contrast — WCAG AA</h2>
				<div className="brand-contrast-table">
					{contrastPairs.map((pair) => (
						<div key={`${pair.background}-${pair.text}`}>
							<span style={{ color: pair.text, backgroundColor: pair.background }}>Aa · {pair.text} on {pair.background}</span>
							<strong>{pair.ratio.toFixed(2)}:1</strong>
							<span>{pair.passes ? 'Pass' : 'Fail'} ({pair.threshold}:1{pair.largeText ? ', large text' : ''})</span>
						</div>
					))}
				</div>
			</section>
		</section>
	);
}
