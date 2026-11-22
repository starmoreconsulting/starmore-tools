import { describe, expect, it } from 'vitest';
import { formatXml } from './xml-formatter';

describe('XML formatter', () => {
	it('formats nested elements and declaration', () => {
		expect(formatXml('<?xml version="1.0"?><catalog><item id="1">Hello</item><item/></catalog>', 2)).toBe(
			'<?xml version="1.0"?>\n<catalog>\n  <item id="1">\n    Hello\n  </item>\n  <item/>\n</catalog>',
		);
	});

	it('preserves comments, CDATA, processing instructions, and 4-space indentation', () => {
		expect(formatXml('<root><!-- note --><![CDATA[a < b & c]]><?pi value?><child>Text</child></root>', 4)).toBe(
			'<root>\n    <!-- note -->\n    <![CDATA[a < b & c]]>\n    <?pi value?>\n    <child>\n        Text\n    </child>\n</root>',
		);
	});

	it('handles doctype declarations and text-only documents', () => {
		expect(formatXml('<!DOCTYPE note><note>Hi</note>')).toBe('<!DOCTYPE note>\n<note>\n  Hi\n</note>');
		expect(formatXml('plain text')).toBe('plain text');
		expect(formatXml('')).toBe('');
	});

	it('reports malformed markup and mismatched tags', () => {
		expect(() => formatXml('<root><child></root>')).toThrow('closing tag mismatch');
		expect(() => formatXml('<root><child></child>')).toThrow('unclosed <root>');
		expect(() => formatXml('<root></other>')).toThrow('closing tag mismatch');
		expect(() => formatXml('<root><!-- unfinished')).toThrow('unclosed comment');
		expect(() => formatXml('<root><![CDATA[unfinished')).toThrow('unclosed CDATA');
		expect(() => formatXml('<root><?unfinished')).toThrow('unclosed processing instruction');
		expect(() => formatXml('<root title="unfinished>')).toThrow('unclosed quoted attribute');
		expect(() => formatXml('<root>', 0)).toThrow('between 1 and 8');
	});
});
