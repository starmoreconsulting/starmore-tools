import { describe, expect, it } from 'vitest';
import { transformUrlText } from './url-encoder';

describe('URL encoder and decoder', () => {
	it('encodes and decodes individual URL components', () => {
		const encoded = transformUrlText('name=Jane Doe & Co.', 'encode');
		expect(encoded).toBe('name%3DJane%20Doe%20%26%20Co.');
		expect(transformUrlText(encoded, 'decode')).toBe('name=Jane Doe & Co.');
	});

	it('encodes and decodes a full URL while preserving URL delimiters', () => {
		const url = 'https://example.com/a path?q=hello world&next=/home#section';
		const encoded = transformUrlText(url, 'encode', 'url');
		expect(encoded).toBe('https://example.com/a%20path?q=hello%20world&next=/home#section');
		expect(transformUrlText(encoded, 'decode', 'url')).toBe(url);
	});

	it('does not convert plus signs to spaces when decoding components', () => {
		expect(transformUrlText('a+b%20c', 'decode')).toBe('a+b c');
	});

	it('handles Unicode and empty text', () => {
		expect(transformUrlText('你好 🌟', 'decode', 'component')).toBe('你好 🌟');
		expect(transformUrlText('', 'encode')).toBe('');
	});

	it('reports malformed percent escapes and invalid modes/actions', () => {
		expect(() => transformUrlText('%E0%A4%A', 'decode')).toThrow('invalid or incomplete');
		expect(() => transformUrlText('%ZZ', 'decode', 'url')).toThrow('invalid or incomplete');
		expect(() => transformUrlText('hello', 'encode', 'query' as 'component')).toThrow('valid URL encoding mode');
		expect(() => transformUrlText('hello', 'compress' as 'encode')).toThrow('Choose encode or decode');
	});
});
