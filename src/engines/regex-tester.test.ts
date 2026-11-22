import { describe, expect, it } from 'vitest';
import { normalizeRegexFlags, testRegex } from './regex-tester';

describe('Regex tester', () => {
	it('finds global matches and groups', () => {
		const result = testRegex({ pattern: '(\\w+)@(\\w+\\.\\w+)', flags: 'g', text: 'Send a@b.com or c@d.org', replacement: '' });
		expect(result.count).toBe(2);
		expect(result.matches[0]).toMatchObject({ text: 'a@b.com', index: 5, groups: ['a', 'b.com'] });
		expect(result.matches[1]).toMatchObject({ text: 'c@d.org', index: 16, groups: ['c', 'd.org'] });
	});

	it('supports named groups, case-insensitive matching, and replacement previews', () => {
		const result = testRegex({ pattern: '(?<word>hello)', flags: 'gi', text: 'Hello hello', replacement: 'Hi $<word>' });
		expect(result.count).toBe(2);
		expect(result.matches[0].namedGroups).toEqual({ word: 'Hello' });
		expect(result.replaced).toBe('Hi Hello Hi hello');
	});

	it('reports invalid patterns and flags', () => {
		expect(testRegex({ pattern: '(', flags: 'g', text: 'text', replacement: '' }).error).not.toBe('');
		expect(normalizeRegexFlags('gigggm')).toBe('gim');
		expect(testRegex({ pattern: 'a', flags: 'gg', text: 'a', replacement: '' }).count).toBe(1);
	});

	it('handles multiline mode and zero-length matches safely', () => {
		const result = testRegex({ pattern: '^', flags: 'gm', text: 'one\ntwo', replacement: '>' });
		expect(result.count).toBe(2);
		expect(result.replaced).toBe('>one\n>two');
		expect(testRegex({ pattern: '(?:)', flags: 'g', text: 'ab', replacement: '', maxMatches: 10 }).count).toBe(3);
	});

	it('returns a count even without displaying more than the match limit', () => {
		const result = testRegex({ pattern: '.', flags: 'g', text: 'abcdefghijkl', replacement: '', maxMatches: 3 });
		expect(result.count).toBe(12);
		expect(result.matches).toHaveLength(3);
	});

	it('handles an empty pattern and replacement preview', () => {
		expect(testRegex({ pattern: '', flags: 'g', text: 'abc', replacement: 'x' })).toEqual({ matches: [], replaced: 'abc', count: 0, error: '' });
		expect(testRegex({ pattern: 'b', flags: 'g', text: 'abc', replacement: 'Z' }).replaced).toBe('aZc');
	});
});
