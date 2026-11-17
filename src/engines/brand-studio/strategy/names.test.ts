import { describe, expect, it } from 'vitest';
import { generateBrandNames, generateBrandNamesWithStats, getNameFilterFailures, isOffensiveName } from './names';

const base = {
	keywords: ['harbor', 'studio'],
	industry: 'Creative' as const,
	style: 'Modern' as const,
	length: 'balanced' as const,
	seed: 934,
};

describe('brand name generation', () => {
	it('is deterministic for identical inputs and seed', () => {
		expect(generateBrandNames(base)).toEqual(generateBrandNames(base));
	});

	it('returns 24 unique names within selected bounds', () => {
		const names = generateBrandNames(base);
		expect(names).toHaveLength(24);
		expect(new Set(names.map((name) => name.toLocaleLowerCase())).size).toBe(24);
		for (const name of names) {
			const length = Array.from(name.replace(/\s/g, '')).length;
			expect(length).toBeGreaterThanOrEqual(5);
			expect(length).toBeLessThanOrEqual(13);
			expect(name).not.toMatch(/(.)\1{2}/u);
			expect(isOffensiveName(name)).toBe(false);
		}
	});

	it('filters offensive terms even when they occur inside a blend', () => {
		expect(isOffensiveName('harFuckbor')).toBe(true);
		expect(generateBrandNames({ ...base, keywords: ['harFuckbor'] }).every((name) => !isOffensiveName(name))).toBe(true);
	});

	it.each([
		['zero keywords', []],
		['one-letter keyword', ['Q']],
		['accented keyword', ['Café']],
		['non-Latin keyword', ['東京']],
	])('handles %s without crashing', (_name, keywords) => {
		const names = generateBrandNames({ ...base, keywords, length: 'long', seed: 725 });
		expect(Array.isArray(names)).toBe(true);
		for (const name of names) expect(isOffensiveName(name)).toBe(false);
	});

	it.each(['naïve', 'café', 'zoë', 'naïïve'])('never emits invalid vowel or accent runs from %s', (keyword) => {
		for (let seed = 0; seed < 80; seed += 1) {
			const names = generateBrandNames({ ...base, keywords: [keyword], seed });
			for (const name of names) {
				expect(getNameFilterFailures(name, base.length)).toEqual([]);
				const plain = name.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase().replace(/\s/g, '');
				expect(plain).not.toMatch(/([aeiou])\1/u);
			}
		}
	});

	it('preserves accents only in an unchanged whole keyword and strips them from compounds', () => {
		const names = Array.from({ length: 60 }, (_, seed) =>
			generateBrandNames({ ...base, keywords: ['Café'], seed, count: 24 }),
		).flat();
		expect(names.some((name) => name.startsWith('Café '))).toBe(true);
		expect(names.some((name) => name.toLocaleLowerCase().startsWith('cafe') && !name.startsWith('Café '))).toBe(true);
	});

	it('keeps all generated results within every filter across 500 seeds and five keyword sets', () => {
		const keywordSets = [
			['swift', 'delivery', 'lagos'],
			['naïve', 'café', 'zoë'],
			['東京'],
			['Q'],
			[],
		];
		for (let seed = 0; seed < 500; seed += 1) {
			for (const keywords of keywordSets) {
				const names = generateBrandNames({ ...base, keywords, seed });
				expect(names.length).toBeGreaterThan(0);
				for (const name of names) {
					expect(getNameFilterFailures(name, base.length), `${name} at seed ${seed}`).toEqual([]);
				}
			}
		}
	});

	it('reports actual candidate filter failures for quality reporting', () => {
		const report = generateBrandNamesWithStats({ ...base, keywords: ['swift', 'delivery', 'lagos'], count: 100 });
		expect(report.names).toHaveLength(100);
		expect(report.candidatesChecked).toBeGreaterThanOrEqual(report.names.length);
		expect(report.filterFailures.offensive ?? 0).toBeGreaterThanOrEqual(0);
		for (const name of report.names) expect(getNameFilterFailures(name, base.length)).toEqual([]);
	});

	it('honours an optional starting letter and length preference', () => {
		const names = generateBrandNames({ ...base, startingLetter: 'M', length: 'short' });
		expect(names.length).toBeGreaterThan(0);
		expect(names.every((name) => name.toLocaleLowerCase().startsWith('m'))).toBe(true);
		expect(names.every((name) => Array.from(name.replace(/\s/g, '')).length <= 8)).toBe(true);
	});
});
