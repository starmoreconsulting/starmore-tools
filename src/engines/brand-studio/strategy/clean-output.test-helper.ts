import { expect } from 'vitest';

function normalizedWords(values: readonly string[]): Set<string> {
	return new Set(values.flatMap((value) => value.match(/\p{Lu}[\p{L}'-]*/gu) ?? []));
}

export function assertCleanOutput(text: string, userInput: readonly string[] = []): void {
	expect(text).not.toMatch(/undefined|null|NaN|\[object/i);
	expect(text).not.toMatch(/[{}]/);
	expect(text).not.toMatch(/ {2,}/);
	expect(text).not.toMatch(/\bThis brand\b|\bYour business\b/i);

	const properNouns = normalizedWords(userInput);
	for (const match of text.matchAll(/,\s+([A-Z][\p{L}'-]*)/gu)) {
		expect(properNouns.has(match[1]), `unexpected capital after comma: ${match[1]}`).toBe(true);
	}
}

export { sanitizeGeneratedText } from './sanitize';
