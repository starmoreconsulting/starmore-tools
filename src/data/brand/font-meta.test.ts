import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { logoFonts } from '../../engines/logo-studio/library/fonts';
import { bundledBrandFonts, curatedFontPairings, getGeneratedFontPairings } from './font-meta';

describe('Brand Studio font metadata and pairings', () => {
	const bundled = new Set(logoFonts.map((font) => font.family));
	const require = createRequire(import.meta.url);

	it('lists only bundled font families with local license and actual weights', () => {
		expect(bundledBrandFonts.map((font) => font.family).sort()).toEqual([...bundled].sort());
		expect(bundledBrandFonts.every((font) => font.moodTags.length > 0 && font.availableWeights.length > 0)).toBe(true);
		for (const metadata of bundledBrandFonts) {
			const definition = logoFonts.find((font) => font.family === metadata.family)!;
			expect(metadata.availableWeights).toEqual(definition.regular === definition.bold ? [400] : [400, 700]);
			const packageName = `@fontsource/${metadata.family.toLowerCase().replace(/\s+/g, '-')}`;
			expect(metadata.license).toBe(require(`${packageName}/package.json`).license);
		}
	});

	it('provides at least twelve curated pairs of distinct bundled families across categories', () => {
		expect(curatedFontPairings.length).toBeGreaterThanOrEqual(12);
		for (const pair of curatedFontPairings) {
			const families = [pair.heading, pair.subheading, pair.body];
			expect(new Set(families).size).toBe(3);
			expect(families.every((family) => bundled.has(family))).toBe(true);
			const categories = families.map((family) => logoFonts.find((font) => font.family === family)?.category);
			expect(new Set(categories).size).toBe(3);
		}
	});

	it('creates generated pairs deterministically using bundled fonts only', () => {
		const pairs = getGeneratedFontPairings(128);
		expect(pairs).toEqual(getGeneratedFontPairings(128));
		for (const pair of pairs) {
			const families = [pair.heading, pair.subheading, pair.body];
			expect(new Set(families).size).toBe(3);
			expect(families.every((family) => bundled.has(family))).toBe(true);
		}
	});
});
