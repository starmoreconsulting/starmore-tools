import { expect } from 'vitest';
import { isCleanGeneratedText } from './sanitize';

export function assertCleanOutput(text: string, userInput: readonly string[] = []): void {
	expect(isCleanGeneratedText(text, userInput)).toBe(true);
}

export { sanitizeGeneratedText } from './sanitize';
