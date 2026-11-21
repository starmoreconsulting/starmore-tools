import { describe, expect, it } from 'vitest';
import { compareTextLines } from './text-comparison';

describe('compareTextLines', () => {
	it('identifies unchanged, removed and added lines', () => {
		const result = compareTextLines('one\ntwo\nthree', 'one\nTWO\nthree\nfour');
		expect(result.unchanged).toBe(2);
		expect(result.removed).toBe(1);
		expect(result.added).toBe(2);
		expect(result.diff).toContainEqual({ kind: 'same', left: 'one', right: 'one' });
		expect(result.diff).toContainEqual({ kind: 'removed', left: 'two', right: null });
		expect(result.diff).toContainEqual({ kind: 'added', left: null, right: 'TWO' });
		expect(result.diff).toContainEqual({ kind: 'added', left: null, right: 'four' });
	});

	it('handles empty text', () => {
		expect(compareTextLines('', '')).toEqual({ diff: [], added: 0, removed: 0, unchanged: 0 });
		expect(compareTextLines('', 'new')).toEqual({ diff: [{ kind: 'added', left: null, right: 'new' }], added: 1, removed: 0, unchanged: 0 });
	});

	it('handles CRLF and keeps identical documents unchanged', () => {
		const result = compareTextLines('one\r\ntwo', 'one\ntwo');
		expect(result).toEqual({ diff: [{ kind: 'same', left: 'one', right: 'one' }, { kind: 'same', left: 'two', right: 'two' }], added: 0, removed: 0, unchanged: 2 });
	});
});
