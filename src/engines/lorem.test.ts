import { describe, expect, it } from 'vitest';
import { generateLorem } from './lorem';

describe('generateLorem', () => {
	it('generates deterministic word output', () => {
		const one = generateLorem('words', 10, 42);
		const two = generateLorem('words', 10, 42);
		expect(one).toBe(two);
		expect(one.split(/\s+/)).toHaveLength(10);
	});

	it('generates requested sentence and paragraph counts', () => {
		const sentences = generateLorem('sentences', 3, 42);
		expect(sentences.match(/[.!?](?:\s|$)/g)).toHaveLength(3);
		const paragraphs = generateLorem('paragraphs', 3, 42);
		expect(paragraphs.split(/\n\n/)).toHaveLength(3);
	});

	it('rejects invalid counts', () => {
		expect(() => generateLorem('words', 0)).toThrow('Count must be a whole number from 1 to 100.');
		expect(() => generateLorem('paragraphs', 101)).toThrow('Count must be a whole number from 1 to 100.');
		expect(() => generateLorem('words', 2.5)).toThrow('Count must be a whole number from 1 to 100.');
	});
});
