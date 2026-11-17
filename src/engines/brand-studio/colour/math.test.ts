import { describe, expect, it } from 'vitest';
import {
	assignPaletteRoles,
	generateHarmony,
	getContrastPairs,
	hexToHsl,
	hexToRgb,
	hslToHex,
	paletteHasNoAccessibleText,
	rgbToHex,
} from './math';
import { contrastRatio } from '../designs/generate';

describe('Brand Studio colour maths', () => {
	it('round-trips HEX through HSL', () => {
		expect(hslToHex(hexToHsl('#4A8B72'))).toBe('#4A8B72');
		expect(rgbToHex(hexToRgb('#A1B2C3'))).toBe('#A1B2C3');
	});

	it('calculates black on white as 21:1 contrast', () => {
		expect(contrastRatio('#000000', '#FFFFFF')).toBe(21);
	});

	it.each(['complementary', 'analogous', 'triadic', 'split-complementary', 'monochrome'] as const)(
		'generates valid HEX colours for %s harmony',
		(harmony) => {
			expect(generateHarmony('#356B54', harmony, 12).every((hex) => /^#[\da-f]{6}$/i.test(hex))).toBe(true);
		},
	);

	it('assigns every role for twenty deterministic seeds', () => {
		for (let seed = 0; seed < 20; seed += 1) {
			const palette = assignPaletteRoles('#D69A35', 'analogous', seed);
			expect(palette.map((color) => color.role)).toEqual(['primary', 'secondary', 'accent', 'light', 'dark']);
			expect(palette.every((color) => /^#[\da-f]{6}$/i.test(color.hex))).toBe(true);
		}
	});

	it('marks AA contrast from the same ratio used in its table', () => {
		const pairs = getContrastPairs(assignPaletteRoles('#D6A11D', 'triadic'));
		expect(pairs).toHaveLength(20);
		for (const pair of pairs) {
			expect(pair.threshold).toBe(pair.largeText ? 3 : 4.5);
			expect(pair.passes).toBe(pair.ratio >= pair.threshold);
		}
		expect(paletteHasNoAccessibleText([{ role: 'primary', hex: '#FFFFFF' }])).toBe(false);
	});
});
