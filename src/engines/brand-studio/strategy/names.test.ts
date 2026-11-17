import { describe, expect, it } from 'vitest';
import { generateBrandNames, isOffensiveName } from './names';

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

	it('honours an optional starting letter and length preference', () => {
		const names = generateBrandNames({ ...base, startingLetter: 'M', length: 'short' });
		expect(names.length).toBeGreaterThan(0);
		expect(names.every((name) => name.toLocaleLowerCase().startsWith('m'))).toBe(true);
		expect(names.every((name) => Array.from(name.replace(/\s/g, '')).length <= 8)).toBe(true);
	});
});
