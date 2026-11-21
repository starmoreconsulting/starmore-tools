import { describe, expect, it } from 'vitest';
import { formatText } from './text-formatter';

describe('formatText', () => {
	it('formats paragraphs and collapses extra whitespace', () => {
		expect(formatText('  Hello   world  \n\n  Second  paragraph  ', 'plain', 80)).toBe('Hello world\n\nSecond paragraph');
	});

	it('formats text as one line', () => {
		expect(formatText('Hello\nworld\n\nNext', 'single-line', 80)).toBe('Hello world Next');
	});

	it('wraps paragraphs to a selected line length', () => {
		expect(formatText('one two three four five', 'paragraphs', 16)).toBe('one two three\nfour five');
	});

	it('returns empty text unchanged', () => {
		expect(formatText('  \n  ', 'plain', 80)).toBe('');
	});
});
