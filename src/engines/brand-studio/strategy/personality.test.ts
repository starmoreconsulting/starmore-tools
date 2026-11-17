import { describe, expect, it } from 'vitest';
import { personalityScales, buildPersonality } from './personality';
import { styleRules } from '../../logo-studio/templates/rules';

describe('brand personality builder', () => {
	it('organizes traits on the five requested opposing scales and caps selections at five', () => {
		expect(personalityScales).toHaveLength(5);
		const result = buildPersonality(['Formal', 'Playful', 'Bold', 'Classic', 'Friendly', 'Modern']);
		expect(result.traits).toHaveLength(5);
		expect(result.notes).toHaveLength(5);
		expect(result.doList).toHaveLength(5);
		expect(result.dontList).toHaveLength(5);
	});

	it('suggests design styles, palettes and font categories from Logo Studio rules', () => {
		const result = buildPersonality(['Modern', 'Subtle']);
		expect(result.styles.length).toBeGreaterThan(0);
		expect(result.styles.every((style) => style in styleRules)).toBe(true);
		expect(result.palettes.length).toBeGreaterThan(0);
		expect(result.fontCategories.length).toBeGreaterThan(0);
	});
});
