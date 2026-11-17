import { describe, expect, it } from 'vitest';
import { generateBrandSlogans, isKnownSloganMatch } from './slogans';

const base = {
	businessName: 'Harbor Studio',
	whatYouDo: 'design useful spaces',
	whoYouServe: 'local makers',
	benefit: 'a calmer workday',
	tone: 'friendly' as const,
	seed: 1924,
};

describe('brand slogan generation', () => {
	it('returns 20 complete original-pattern suggestions', () => {
		const slogans = generateBrandSlogans(base);
		expect(slogans).toHaveLength(20);
		expect(slogans.every((slogan) => slogan.length <= 120 && !/\{[^}]+\}/.test(slogan))).toBe(true);
		expect(new Set(slogans.map((slogan) => slogan.toLocaleLowerCase())).size).toBe(20);
		expect(slogans.every((slogan) => !isKnownSloganMatch(slogan))).toBe(true);
	});

	it('filters exact and near matches to well-known slogans', () => {
		expect(isKnownSloganMatch('Just do it')).toBe(true);
		expect(isKnownSloganMatch('Just do i')).toBe(true);
		expect(isKnownSloganMatch('Made for a calmer workday')).toBe(false);
	});

	it('uses concise fallback phrases for omitted answers without exposing slots', () => {
		const slogans = generateBrandSlogans({
			businessName: '', whatYouDo: '', whoYouServe: '', benefit: '', tone: 'professional', seed: 33,
		});
		expect(slogans).toHaveLength(20);
		expect(slogans.every((slogan) => !/\{[^}]+\}/.test(slogan) && slogan.trim().length > 0)).toBe(true);
	});
});
