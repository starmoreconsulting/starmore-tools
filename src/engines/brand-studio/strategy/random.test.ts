import { describe, expect, it } from 'vitest';
import { createSeededRandom, nextSeed, seededShuffle } from './random';

describe('seeded strategy random helpers', () => {
	it('returns the same sequence for the same seed', () => {
		const first = createSeededRandom(42);
		const second = createSeededRandom(42);
		expect(Array.from({ length: 10 }, first)).toEqual(Array.from({ length: 10 }, second));
	});

	it('produces a changed shuffle for a new seed without losing items', () => {
		const values = Array.from({ length: 24 }, (_, index) => index);
		const shuffled = seededShuffle(values, nextSeed(42));
		expect(shuffled).not.toEqual(seededShuffle(values, 42));
		expect([...shuffled].sort((a, b) => a - b)).toEqual(values);
	});
});
