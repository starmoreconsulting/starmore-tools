import { contrastRatio } from '../designs/generate';
import { createSeededRandom } from '../strategy/random';
import type { BrandColorRole } from '../../logo-studio/brand/kit';

export type Rgb = { r: number; g: number; b: number };
export type Hsl = { h: number; s: number; l: number };
export type Harmony = 'complementary' | 'analogous' | 'triadic' | 'split-complementary' | 'monochrome';
export interface PaletteColor {
	role: BrandColorRole;
	hex: string;
}
export interface ContrastPair {
	text: '#000000' | '#FFFFFF';
	background: string;
	ratio: number;
	threshold: number;
	passes: boolean;
	largeText: boolean;
}

export function hexToRgb(hex: string): Rgb {
	if (!/^#[\da-f]{6}$/i.test(hex)) throw new Error('Enter a six-digit HEX colour.');
	return {
		r: Number.parseInt(hex.slice(1, 3), 16),
		g: Number.parseInt(hex.slice(3, 5), 16),
		b: Number.parseInt(hex.slice(5, 7), 16),
	};
}

export function rgbToHex({ r, g, b }: Rgb): string {
	const values = [r, g, b];
	if (!values.every((value) => Number.isFinite(value) && value >= 0 && value <= 255)) {
		throw new Error('RGB channels must be between 0 and 255.');
	}
	return `#${values.map((value) => Math.round(value).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

export function rgbToHsl({ r, g, b }: Rgb): Hsl {
	const red = r / 255;
	const green = g / 255;
	const blue = b / 255;
	const maximum = Math.max(red, green, blue);
	const minimum = Math.min(red, green, blue);
	const difference = maximum - minimum;
	let hue = 0;
	const lightness = (maximum + minimum) / 2;
	let saturation = 0;
	if (difference) {
		saturation = difference / (1 - Math.abs(2 * lightness - 1));
		switch (maximum) {
			case red: hue = ((green - blue) / difference + (green < blue ? 6 : 0)) / 6; break;
			case green: hue = ((blue - red) / difference + 2) / 6; break;
			default: hue = ((red - green) / difference + 4) / 6;
		}
	}
	return { h: hue * 360, s: saturation * 100, l: lightness * 100 };
}

export function hslToRgb({ h, s, l }: Hsl): Rgb {
	if (![h, s, l].every(Number.isFinite) || s < 0 || s > 100 || l < 0 || l > 100) {
		throw new Error('HSL values must use a hue from 0 to 360 and saturation/lightness from 0 to 100.');
	}
	const hue = ((h % 360) + 360) % 360 / 360;
	const saturation = s / 100;
	const lightness = l / 100;
	const channel = (offset: number) => {
		const k = (offset + hue * 12) % 12;
		const a = saturation * Math.min(lightness, 1 - lightness);
		return lightness - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
	};
	return {
		r: Math.round(channel(0) * 255),
		g: Math.round(channel(8) * 255),
		b: Math.round(channel(4) * 255),
	};
}

export function hexToHsl(hex: string): Hsl {
	return rgbToHsl(hexToRgb(hex));
}

export function hslToHex(hsl: Hsl): string {
	return rgbToHex(hslToRgb(hsl));
}

export function adjustLightness(hex: string, amount: number): string {
	const color = hexToHsl(hex);
	return hslToHex({ ...color, l: Math.max(0, Math.min(100, color.l + amount)) });
}

export function adjustSaturation(hex: string, amount: number): string {
	const color = hexToHsl(hex);
	return hslToHex({ ...color, s: Math.max(0, Math.min(100, color.s + amount)) });
}

function hueColor(base: Hsl, hue: number, saturation = base.s, lightness = base.l): string {
	return hslToHex({ h: hue, s: Math.max(0, Math.min(100, saturation)), l: Math.max(0, Math.min(100, lightness)) });
}

export function generateHarmony(hex: string, harmony: Harmony, seed = 0): string[] {
	const base = hexToHsl(hex);
	const random = createSeededRandom(seed);
	const variation = (random() - 0.5) * 12;
	switch (harmony) {
		case 'complementary':
			return [hueColor(base, base.h + 180 + variation, base.s, base.l)];
		case 'analogous':
			return [hueColor(base, base.h - 30 + variation), hueColor(base, base.h + 30 + variation)];
		case 'triadic':
			return [hueColor(base, base.h + 120 + variation), hueColor(base, base.h + 240 + variation)];
		case 'split-complementary':
			return [hueColor(base, base.h + 150 + variation), hueColor(base, base.h + 210 + variation)];
		case 'monochrome':
			return [
				hueColor(base, base.h, base.s * 0.72, base.l - 22),
				hueColor(base, base.h, base.s * 0.82, base.l + 18),
			];
	}
}

export function assignPaletteRoles(hex: string, harmony: Harmony, seed = 0): PaletteColor[] {
	const [secondary, accent] = generateHarmony(hex, harmony, seed);
	const base = hexToHsl(hex);
	return [
		{ role: 'primary', hex: rgbToHex(hexToRgb(hex)) },
		{ role: 'secondary', hex: secondary ?? hueColor(base, base.h + 120) },
		{ role: 'accent', hex: accent ?? hueColor(base, base.h + 240, base.s * 0.75) },
		{ role: 'light', hex: hueColor(base, base.h, Math.min(base.s * 0.18, 18), 96) },
		{ role: 'dark', hex: hueColor(base, base.h, Math.max(base.s * 0.45, 10), 18) },
	];
}

export function getContrastPairs(colors: readonly PaletteColor[]): ContrastPair[] {
	return colors.flatMap(({ hex: background }) => (['#000000', '#FFFFFF'] as const).flatMap((text) => [false, true].map((largeText) => {
		const ratio = contrastRatio(text, background);
		const threshold = largeText ? 3 : 4.5;
		return { text, background, ratio, threshold, passes: ratio >= threshold, largeText };
	})));
}

export function paletteHasNoAccessibleText(colors: readonly PaletteColor[]): boolean {
	return colors.some(({ hex }) => !['#000000', '#FFFFFF'].some((text) => contrastRatio(text, hex) >= 4.5));
}
