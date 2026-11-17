import { describe, expect, it } from 'vitest';
import { industryRules, styleRules } from '../../engines/logo-studio/templates/rules';
import { industryWords, styleWords } from './word-banks';

describe('editable strategy word banks', () => {
	it('uses the same industry and style names as Logo Studio rules', () => {
		expect(Object.keys(industryWords).sort()).toEqual(Object.keys(industryRules).sort());
		expect(Object.keys(styleWords).sort()).toEqual(Object.keys(styleRules).sort());
		for (const words of [...Object.values(industryWords), ...Object.values(styleWords)]) {
			expect(words.length).toBeGreaterThan(0);
			expect(words.every((word) => word.trim() === word && word.length > 0)).toBe(true);
		}
	});
});
