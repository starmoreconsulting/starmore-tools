import { describe, expect, it } from 'vitest';
import { formatHtml } from './html-formatter';

describe('HTML formatter', () => {
	it('indents block elements and preserves attributes', () => {
		expect(formatHtml('<!doctype html><html><body><main class="content"><h1>Hello</h1><p>World</p></main></body></html>')).toBe(
			'<!doctype html>\n<html>\n  <body>\n    <main class="content">\n      <h1>Hello</h1>\n      <p>World</p>\n    </main>\n  </body>\n</html>',
		);
	});

	it('keeps inline markup and existing inline whitespace together', () => {
		expect(formatHtml('<p>Hello <strong>there</strong>!</p>')).toBe('<p>Hello <strong>there</strong>!</p>');
	});

	it('does not split tag attributes that contain quoted greater-than signs', () => {
		expect(formatHtml('<div title="a > b"><span>text</span></div>')).toBe('<div title="a > b"><span>text</span></div>');
	});

	it('preserves comments, void tags, and raw-text contents', () => {
		expect(formatHtml('<div><!-- keep --><img src="x"><script>if (a < b) { x(); }</script></div>')).toBe(
			'<div>\n  <!-- keep --><img src="x">\n  <script>if (a < b) { x(); }</script>\n</div>',
		);
	});

	it('rejects unfinished markup and invalid indentation settings', () => {
		expect(() => formatHtml('<div title="unfinished></div>')).toThrow('unclosed quoted attribute');
		expect(() => formatHtml('<div><!-- unfinished')).toThrow('unclosed comment');
		expect(() => formatHtml('<script>unfinished')).toThrow('unclosed <script>');
		expect(() => formatHtml('<div></div>', 0)).toThrow('between 1 and 8');
	});
});
