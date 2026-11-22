import { describe, expect, it } from 'vitest';
import { transformBase64 } from './base64';

describe('Base64 encoder and decoder', () => {
	it('encodes and decodes UTF-8 text', () => {
		const encoded = transformBase64('Hello, world!', 'encode');
		expect(encoded).toBe('SGVsbG8sIHdvcmxkIQ==');
		expect(transformBase64(encoded, 'decode')).toBe('Hello, world!');
		const unicode = transformBase64('Hello, 世界 🌟', 'encode');
		expect(transformBase64(unicode, 'decode')).toBe('Hello, 世界 🌟');
	});

	it('accepts whitespace and omitted padding when decoding', () => {
		expect(transformBase64('SGVs\nbG8sIA', 'decode')).toBe('Hello, ');
		expect(transformBase64('SGVsbG8=', 'decode')).toBe('Hello');
	});

	it('handles empty input', () => {
		expect(transformBase64('', 'encode')).toBe('');
		expect(transformBase64('', 'decode')).toBe('');
	});

	it('reports invalid alphabet, length, padding, and UTF-8', () => {
		expect(() => transformBase64('SGVsbG8*', 'decode')).toThrow('outside the standard alphabet');
		expect(() => transformBase64('A', 'decode')).toThrow('invalid length');
		expect(() => transformBase64('SG=V', 'decode')).toThrow('outside the standard alphabet');
		expect(() => transformBase64('SGVsbG8==', 'decode')).toThrow('invalid padding');
		expect(() => transformBase64('/w==', 'decode')).toThrow('not valid UTF-8');
		expect(() => transformBase64('Zh==', 'decode')).toThrow('non-canonical padding bits');
		expect(() => transformBase64('text', 'compress' as 'encode')).toThrow('Choose encode or decode');
	});
});
