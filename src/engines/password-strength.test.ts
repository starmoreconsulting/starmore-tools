import { describe, expect, it } from 'vitest';
import { assessPasswordStrength } from './password-strength';

describe('assessPasswordStrength', () => {
	it('prompts for input without rating an empty password', () => {
		expect(assessPasswordStrength('')).toMatchObject({
			score: 0,
			label: 'Not rated',
			length: 0,
		});
	});

	it('marks common passwords as very weak', () => {
		expect(assessPasswordStrength('Password123')).toMatchObject({
			score: 0,
			label: 'Very weak',
			isCommon: true,
		});
	});

	it('recognizes length, Unicode characters, and character variety', () => {
		const result = assessPasswordStrength('Café🌿-River-2026!');
		expect(result.length).toBe(17);
		expect(result.characterTypes).toBe(4);
		expect(result.score).toBe(5);
		expect(result.label).toBe('Very strong');
	});

	it('reduces the estimate for repeated runs and simple sequences', () => {
		const result = assessPasswordStrength('Abc123!!aaaaXy');
		expect(result.hasRepeatedRun).toBe(true);
		expect(result.hasSequence).toBe(true);
		expect(result.feedback).toContain('Avoid repeating the same character three or more times.');
		expect(result.feedback).toContain('Avoid keyboard patterns and sequential characters.');
	});

	it('does not count non-Latin letters as symbols', () => {
		expect(assessPasswordStrength('парольдлинный').characterTypes).toBe(1);
	});
});
