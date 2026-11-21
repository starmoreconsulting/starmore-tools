import { describe, expect, it } from 'vitest';
import { cleanWhitespace, countCharacters, countWords, replaceText, reverseText } from './text';

describe('text utilities', () => {
	it('counts Unicode code points consistently, including emoji', () => {
		expect(countWords('A🌿 B')).toEqual({
			words: 2,
			characters: 4,
			charactersWithoutSpaces: 3,
			readingMinutes: 1,
		});
		expect(countCharacters('A🌿 B')).toEqual({
			characters: 4,
			charactersWithoutSpaces: 3,
			words: 2,
			lines: 1,
		});
	});

	it('counts empty text and line breaks clearly', () => {
		expect(countCharacters('')).toEqual({
			characters: 0,
			charactersWithoutSpaces: 0,
			words: 0,
			lines: 0,
		});
		expect(countCharacters('one\r\ntwo')).toEqual({
			characters: 8,
			charactersWithoutSpaces: 6,
			words: 2,
			lines: 2,
		});
	});

	it('expands JavaScript capture references in regex replacement mode', () => {
		expect(replaceText('Order 42, order 17', '(\\w+) (\\d+)', '$2-$1', false, false, true)).toEqual({
			result: '42-Order, 17-order',
			count: 2,
			error: '',
		});
	});

	it('reverses characters, words and lines with Unicode-safe character reversal', () => {
		expect(reverseText('A🌿B', 'characters')).toBe('B🌿A');
		expect(reverseText('  Hello   world  ', 'words')).toBe('world Hello');
		expect(reverseText('one\ntwo\nthree', 'lines')).toBe('three\ntwo\none');
	});

	it('cleans inline spaces, line edges and blank lines', () => {
		expect(cleanWhitespace('  Hello   world  \r\n\r\n  Second\tline  ', true, true, true)).toEqual({
			result: 'Hello world\nSecond line',
			removedBlankLines: 1,
		});
		expect(cleanWhitespace('', true, true, true)).toEqual({ result: '', removedBlankLines: 0 });
	});

	it('reports invalid regex and leaves source text unchanged', () => {
		expect(replaceText('keep this', '(', 'x', false, false, true)).toEqual({
			result: 'keep this',
			count: 0,
			error: 'This regular expression is invalid. Check the pattern and try again.',
		});
	});
});
