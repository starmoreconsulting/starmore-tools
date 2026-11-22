import { describe, expect, it } from 'vitest';
import { minifyHtml } from './html-minifier';

describe('HTML minifier', () => {
	it('collapses ordinary whitespace and removes regular comments', () => {
		expect(minifyHtml('\n<div>\n  <p> Hello   world </p>\n</div> <!-- note -->\n')).toBe(
			'<div> <p> Hello world </p> </div>',
		);
	});

	it('preserves whitespace in raw-text and preformatted elements', () => {
		expect(minifyHtml('<pre>  a\n    b  </pre><textarea> a\n b </textarea><script> if (a < b) {\n  run();\n} </script>'))
			.toBe('<pre>  a\n    b  </pre><textarea> a\n b </textarea><script> if (a < b) {\n  run();\n} </script>');
	});

	it('preserves conditional and bang comments and quoted attribute content', () => {
		expect(minifyHtml('<!--[if IE]> old <![endif]--><!--<![endif]--><!--! license --><div title="a > b">ok</div>'))
			.toBe('<!--[if IE]> old <![endif]--><!--<![endif]--><!--! license --><div title="a > b">ok</div>');
	});

	it('preserves CDATA sections and inline text spacing', () => {
		expect(minifyHtml('<span>one</span> \n <span>two</span><![CDATA[ a   b ]]>'))
			.toBe('<span>one</span> <span>two</span><![CDATA[ a   b ]]>');
	});

	it('handles empty input and reports unfinished markup', () => {
		expect(minifyHtml('  \n ')).toBe('');
		expect(() => minifyHtml('<!-- unfinished')).toThrow('unclosed comment');
		expect(() => minifyHtml('<div title="unfinished>')).toThrow('unclosed quoted attribute');
		expect(() => minifyHtml('<script>unfinished')).toThrow('unclosed <script>');
	});
});
