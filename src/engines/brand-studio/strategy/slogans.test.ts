import { describe, expect, it } from 'vitest';
import { sloganPatterns } from '../../../data/brand/slogan-patterns';
import { assertCleanOutput } from './clean-output.test-helper';
import { generateBrandSlogans, generateBrandSlogansWithStats, getSloganQualityFailures, isKnownSloganMatch } from './slogans';

const base = {
	businessName: 'Harbor Studio',
	whatYouDo: 'same-day deliveries',
	whoYouServe: 'small businesses',
	benefit: 'saves you time',
	tone: 'friendly' as const,
	seed: 1924,
};
const userInput = [base.businessName, base.whatYouDo, base.whoYouServe, base.benefit];

describe('brand slogan generation', () => {
	it('returns up to 20 distinct, natural suggestions that pass every quality rule', () => {
		const slogans = generateBrandSlogans(base);
		expect(slogans.length).toBeGreaterThanOrEqual(8);
		expect(slogans.length).toBeLessThanOrEqual(20);
		expect(new Set(slogans.map((slogan) => slogan.toLocaleLowerCase())).size).toBe(slogans.length);
		for (const slogan of slogans) {
			expect(getSloganQualityFailures(slogan, userInput)).toEqual([]);
			expect(isKnownSloganMatch(slogan)).toBe(false);
			assertCleanOutput(slogan, userInput);
		}
	});

	it('supports report generation up to 60 results without exceeding the requested cap', () => {
		const report = generateBrandSlogansWithStats({ ...base, count: 60 });
		expect(report.slogans.length).toBeGreaterThanOrEqual(8);
		expect(report.slogans.length).toBeLessThanOrEqual(60);
		expect(report.candidatesChecked).toBeGreaterThanOrEqual(report.slogans.length);
		expect(report.filterFailures['slot-form']).toBeGreaterThan(0);
	});

	it('filters exact and near matches to well-known slogans', () => {
		expect(isKnownSloganMatch('Just do it')).toBe(true);
		expect(isKnownSloganMatch('Just do i')).toBe(true);
		expect(isKnownSloganMatch('Same-day deliveries for small businesses')).toBe(false);
	});

	it('uses each template only when its declared slot forms fit', () => {
		expect(sloganPatterns.some(({ template, accepts }) =>
			template.includes('{audience}') && accepts.audience === 'pluralGroup')).toBe(true);
		expect(generateBrandSlogans({ ...base, whoYouServe: 'small business' }).every((slogan) => !slogan.includes('small business'))).toBe(true);
		expect(generateBrandSlogans({ ...base, whatYouDo: 'deliver same-day' })).not.toContain('deliver same-day for small businesses');
		expect(generateBrandSlogans({ ...base, benefit: 'Saves you time' }).every((slogan) => !slogan.includes('Saves you time'))).toBe(true);
	});

	it('scores word count, duplicate words, comma count, capitalization, and clean output', () => {
		expect(getSloganQualityFailures('Make good work')).toEqual([]);
		expect(getSloganQualityFailures('Make good work now today for everyone together')).toEqual([]);
		expect(getSloganQualityFailures('Make good')).toContain('word-count');
		expect(getSloganQualityFailures('Make good work now today for everyone together always again')).toContain('word-count');
		expect(getSloganQualityFailures('Make good work work now')).toContain('repeated-word');
		expect(getSloganQualityFailures('Make good work, now, today')).toContain('comma-count');
		expect(getSloganQualityFailures('Make good work, Tomorrow')).toContain('unclean-output');
		expect(getSloganQualityFailures('Make good work {benefit}')).toContain('unfilled-slot');
	});

	it('generates no placeholder text when required slogan inputs are empty', () => {
		expect(generateBrandSlogans({
			businessName: '', whatYouDo: '', whoYouServe: '', benefit: '', tone: 'professional', seed: 33,
		})).toEqual([]);
	});
});
