import { describe, expect, it } from 'vitest';
import { assertCleanOutput } from './clean-output.test-helper';
import { personalityScales, buildPersonality } from './personality';
import { styleRules } from '../../logo-studio/templates/rules';

describe('brand personality builder', () => {
	it('requires at least three traits and keeps generated output empty until then', () => {
		expect(personalityScales).toHaveLength(5);
		for (const traits of [[], ['Formal'], ['Formal', 'Playful']]) {
			const result = buildPersonality(traits);
			expect(result.missing).toHaveLength(3 - traits.length);
			expect(result.missing.every(({ hint }) => hint.length > 0)).toBe(true);
			expect(result.notes).toEqual([]);
			expect(result.doList).toEqual([]);
			expect(result.dontList).toEqual([]);
			expect(result.styles).toEqual([]);
		}
	});

	it('caps selections at five and derives voice and styles from the selected traits', () => {
		const result = buildPersonality(['Formal', 'Playful', 'Bold', 'Classic', 'Friendly', 'Modern']);
		expect(result.traits).toHaveLength(5);
		expect(result.missing).toEqual([]);
		expect(result.notes).toHaveLength(5);
		expect(result.doList).toHaveLength(5);
		expect(result.dontList).toHaveLength(5);
		for (const text of [...result.notes, ...result.doList, ...result.dontList]) assertCleanOutput(text);
	});

	it('suggests design styles, palettes and font categories from Logo Studio rules', () => {
		const result = buildPersonality(['Modern', 'Subtle', 'Friendly']);
		expect(result.styles.length).toBeGreaterThan(0);
		expect(result.styles.every((style) => style in styleRules)).toBe(true);
		expect(result.palettes.length).toBeGreaterThan(0);
		expect(result.fontCategories.length).toBeGreaterThan(0);
	});
});
