import { describe, expect, it } from 'vitest';
import { validatePdfPassword } from './pdf-password';

describe('PDF password validation', () => {
	it('accepts matching passwords', () => {
		expect(validatePdfPassword('secure123', 'secure123')).toBe('secure123');
	});

	it('rejects empty, mismatched and short passwords', () => {
		expect(() => validatePdfPassword('', '')).toThrow('Enter a password');
		expect(() => validatePdfPassword('one', 'two')).toThrow('Passwords do not match');
		expect(() => validatePdfPassword('123', '123')).toThrow('at least 6');
		expect(() => validatePdfPassword('x'.repeat(128), 'x'.repeat(128))).toThrow('127 characters');
	});
});
