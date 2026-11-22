import { describe, expect, it } from 'vitest';
import { validateRemovalPassword } from './pdf-password-removal';

describe('validateRemovalPassword', () => {
	it('accepts a non-empty password', () => {
		expect(validateRemovalPassword('secret123')).toBe('secret123');
	});
	it('rejects empty and overly long passwords', () => {
		expect(() => validateRemovalPassword('')).toThrow('Enter the PDF password');
		expect(() => validateRemovalPassword('x'.repeat(128))).toThrow('too long');
	});
});
