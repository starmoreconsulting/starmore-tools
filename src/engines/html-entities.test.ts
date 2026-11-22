import { describe, expect, it } from 'vitest';
import { decodeHtmlEntities, encodeHtmlEntities, transformHtmlEntities } from './html-entities';

describe('HTML entity encoder and decoder', () => {
	it('encodes HTML-sensitive characters', () => {
		expect(encodeHtmlEntities('<p title="A & B">Tom\'s</p>'))
			.toBe('&lt;p title=&quot;A &amp; B&quot;&gt;Tom&#39;s&lt;/p&gt;');
	});

	it('decodes named entities case-sensitively', () => {
		expect(decodeHtmlEntities('&lt;div&gt;&amp;&quot;&apos;&nbsp;&copy;&mdash;</div>'))
			.toBe('<div>&"\'\u00a0©—</div>');
	});

	it('decodes decimal and hexadecimal numeric entities', () => {
		expect(decodeHtmlEntities('&#65;&#x4e16;&#9731;&#39;')).toBe('A世☃\'');
	});

	it('handles plain text and round trips', () => {
		const text = 'Hello, <world> & "friends" — 世界';
		const encoded = transformHtmlEntities(text, 'encode');
		expect(transformHtmlEntities(encoded, 'decode')).toBe(text);
		expect(decodeHtmlEntities('plain text')).toBe('plain text');
		expect(encodeHtmlEntities('')).toBe('');
	});

	it('reports unknown names and invalid numeric code points', () => {
		expect(() => decodeHtmlEntities('&doesnotexist;')).toThrow('Unknown named HTML entity');
		expect(() => decodeHtmlEntities('&#999999999;')).toThrow('invalid code point');
		expect(() => decodeHtmlEntities('&#xD800;')).toThrow('cannot encode a surrogate');
		expect(() => transformHtmlEntities('text', 'compress' as 'encode')).toThrow('Choose encode or decode');
	});
});
