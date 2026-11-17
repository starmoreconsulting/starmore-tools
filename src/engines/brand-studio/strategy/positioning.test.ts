import { describe, expect, it } from 'vitest';
import { generatePositioning } from './positioning';

describe('positioning assistant', () => {
	it('returns the requested statement structure and explains each part', () => {
		const result = generatePositioning({
			target: 'independent makers', brand: 'Harbor Studio', category: 'design partner',
			benefit: 'make useful spaces', reason: 'we work locally',
		});
		expect(result.options).toHaveLength(3);
		expect(result.options[0].statement).toBe('For independent makers, Harbor Studio is the design partner that make useful spaces because we work locally.');
		expect(result.explanations).toHaveLength(4);
	});

	it('omits empty answers rather than showing placeholders', () => {
		const result = generatePositioning({ target: '', brand: '', category: '', benefit: '', reason: '' });
		expect(result.options).toHaveLength(3);
		expect(result.options.every(({ statement }) => statement.trim() && !/\[[^\]]+\]|\{[^}]+\}/.test(statement))).toBe(true);
	});
});
