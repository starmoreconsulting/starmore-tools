import { useMemo, useState } from 'react';
import { logoPalettes } from '../library/palettes';
import type { Element, GradientFill } from '../model/types';
import type { BrandKit } from '../brand/kit';
import BrandColorSwatches from './BrandColorSwatches';

interface Props {
	element: Element | null;
	onUpdate: (patch: Partial<Element>) => void;
	brandColors?: BrandKit['colors'];
}

interface HslColor {
	h: number;
	s: number;
	l: number;
}

function parseHex(value: string): [number, number, number] | null {
	const match = /^#?([\da-f]{6})$/i.exec(value.trim());
	if (!match) return null;
	return [
		parseInt(match[1].slice(0, 2), 16),
		parseInt(match[1].slice(2, 4), 16),
		parseInt(match[1].slice(4, 6), 16),
	];
}

function toHex(rgb: [number, number, number]): string {
	return `#${rgb.map((value) => Math.min(255, Math.max(0, Math.round(value))).toString(16).padStart(2, '0')).join('')}`;
}

function toHsl([red, green, blue]: [number, number, number]): HslColor {
	const r = red / 255;
	const g = green / 255;
	const b = blue / 255;
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	const difference = max - min;
	let h = 0;
	const l = (max + min) / 2;
	const s = difference === 0 ? 0 : difference / (1 - Math.abs(2 * l - 1));
	if (difference) {
		if (max === r) h = ((g - b) / difference) % 6;
		else if (max === g) h = (b - r) / difference + 2;
		else h = (r - g) / difference + 4;
		h *= 60;
		if (h < 0) h += 360;
	}
	return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function fromHsl({ h, s, l }: HslColor): [number, number, number] {
	const hue = ((h % 360) + 360) % 360;
	const saturation = Math.min(100, Math.max(0, s)) / 100;
	const lightness = Math.min(100, Math.max(0, l)) / 100;
	const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
	const x = chroma * (1 - Math.abs((hue / 60) % 2 - 1));
	const match = lightness - chroma / 2;
	const channels = hue < 60 ? [chroma, x, 0] : hue < 120 ? [x, chroma, 0]
		: hue < 180 ? [0, chroma, x] : hue < 240 ? [0, x, chroma]
			: hue < 300 ? [x, 0, chroma] : [chroma, 0, x];
	return channels.map((channel) => (channel + match) * 255) as [number, number, number];
}

function makeGradient(type: GradientFill['type'], angle: number, colors: string[]): GradientFill {
	return {
		type,
		angle,
		stops: colors.map((color, index) => ({ color, offset: index / (colors.length - 1) })),
	};
}

export default function ColorLibrary({ element, onUpdate, brandColors = [] }: Props) {
	const [hex, setHex] = useState('#203b32');
	const [recent, setRecent] = useState<string[]>(() => {
		try {
			const stored: unknown = JSON.parse(localStorage.getItem('logo-studio-recent-colors') ?? '[]');
			return Array.isArray(stored) ? stored.filter((color): color is string => typeof color === 'string' && parseHex(color) !== null).slice(0, 8) : [];
		} catch {
			return [];
		}
	});
	const [gradientType, setGradientType] = useState<GradientFill['type']>('linear');
	const [angle, setAngle] = useState(0);
	const [stopCount, setStopCount] = useState(2);
	const colors = useMemo(() => parseHex(hex) ?? [32, 59, 50], [hex]);
	const hsl = useMemo(() => toHsl(colors), [colors]);
	const currentGradient = element?.gradient;
	const gradientColors = currentGradient?.stops.map((stop) => stop.color) ?? ['#203b32', '#d7ed79'];
	const applyColor = (color: string) => {
		if (!parseHex(color)) return;
		const normalized = color.startsWith('#') ? color : `#${color}`;
		setHex(normalized);
		setRecent((previous) => {
			const next = [normalized, ...previous.filter((item) => item.toLowerCase() !== normalized.toLowerCase())].slice(0, 8);
			try {
				localStorage.setItem('logo-studio-recent-colors', JSON.stringify(next));
			} catch {
				// Recent colours remain available for this editor session when storage is disabled.
			}
			return next;
		});
		onUpdate({ fill: normalized, gradient: undefined });
	};
	const applyGradient = (next: GradientFill) => onUpdate({ fill: 'none', gradient: next });

	return (
		<section className="logo-library-section" aria-label="Colour library">
			{!element && <p className="logo-phase-hint">Select an element before applying a colour or gradient.</p>}
			{element && <>
				<BrandColorSwatches colors={brandColors} onChoose={applyColor} />
				<h3 className="logo-library-subheading">Palettes</h3>
				<div className="logo-palette-list">
					{logoPalettes.map((palette) => (
						<div className="logo-palette" key={palette.name}>
							<span>{palette.name}</span>
							<div>{palette.colors.map((color) => (
								<button key={color} type="button" className="logo-swatch" style={{ backgroundColor: color }} onClick={() => applyColor(color)} aria-label={`Apply ${color} from ${palette.name}`} title={color} />
							))}</div>
						</div>
					))}
				</div>

				<h3 className="logo-library-subheading">Custom colour</h3>
				<div className="logo-color-controls">
					<label className="logo-phase-field"><span>HEX</span><input value={hex} onChange={(event) => {
						setHex(event.target.value);
						if (parseHex(event.target.value)) applyColor(event.target.value);
					}} /></label>
					<label className="logo-phase-field"><span>Picker</span><input type="color" value={parseHex(hex) ? `#${hex.replace('#', '')}` : '#203b32'} onChange={(event) => applyColor(event.target.value)} /></label>
					<div className="logo-color-channel-grid" aria-label="RGB values">
						{(['R', 'G', 'B'] as const).map((channel, index) => <label className="logo-phase-field" key={channel}><span>{channel}</span><input type="number" min={0} max={255} value={colors[index]} onChange={(event) => {
							const next = [...colors] as [number, number, number];
							next[index] = Number(event.target.value);
							if (Number.isFinite(next[index])) applyColor(toHex(next));
						}} /></label>)}
					</div>
					<div className="logo-color-channel-grid" aria-label="HSL values">
						{(['h', 's', 'l'] as const).map((channel) => <label className="logo-phase-field" key={channel}><span>{channel.toUpperCase()}{channel === 'h' ? '°' : '%'}</span><input type="number" value={hsl[channel]} min={0} max={channel === 'h' ? 360 : 100} onChange={(event) => {
							const next = { ...hsl, [channel]: Number(event.target.value) };
							if (Number.isFinite(next[channel])) applyColor(toHex(fromHsl(next)));
						}} /></label>)}
					</div>
				</div>
				{recent.length > 0 && <div className="logo-recent-colors"><h3 className="logo-library-subheading">Recent colours</h3><div>{recent.map((color) => <button key={color} type="button" className="logo-swatch" style={{ backgroundColor: color }} onClick={() => applyColor(color)} aria-label={`Apply recent ${color}`} />)}</div></div>}

				<h3 className="logo-library-subheading">Gradient fill</h3>
				<label className="logo-phase-field"><span>Type</span><select value={gradientType} onChange={(event) => setGradientType(event.target.value as GradientFill['type'])}><option value="linear">Linear</option><option value="radial">Radial</option></select></label>
				{gradientType === 'linear' && <label className="logo-phase-field"><span>Angle: {angle}°</span><input type="range" min={0} max={360} value={angle} onChange={(event) => setAngle(Number(event.target.value))} /></label>}
				<label className="logo-phase-field"><span>Colour stops</span><select value={stopCount} onChange={(event) => setStopCount(Number(event.target.value))}><option value={2}>2 stops</option><option value={3}>3 stops</option><option value={4}>4 stops</option></select></label>
				<div className="logo-gradient-stop-list">
					{Array.from({ length: stopCount }, (_, index) => (
						<label className="logo-phase-field" key={index}><span>Stop {index + 1}</span><input type="color" value={gradientColors[index] ?? (index % 2 ? '#d7ed79' : '#203b32')} onChange={(event) => {
							const next = Array.from({ length: stopCount }, (_, stopIndex) => gradientColors[stopIndex] ?? (stopIndex % 2 ? '#d7ed79' : '#203b32'));
							next[index] = event.target.value;
							applyGradient(makeGradient(gradientType, angle, next));
						}} /></label>
					))}
				</div>
				<button type="button" onClick={() => applyGradient(makeGradient(gradientType, angle, Array.from({ length: stopCount }, (_, index) => gradientColors[index] ?? (index % 2 ? '#d7ed79' : '#203b32'))))}>Apply gradient</button>
			</>}
		</section>
	);
}
