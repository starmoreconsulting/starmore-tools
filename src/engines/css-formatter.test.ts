import { describe, expect, it } from 'vitest';
import { formatCss } from './css-formatter';

describe('CSS formatter', () => {
	it('formats selectors, declarations, and nested at-rules', () => {
		expect(formatCss('body{margin:0;color:#333}@media (min-width: 600px){.card{padding:1rem}}')).toBe(
			'body {\n  margin:0;\n  color:#333\n}\n@media (min-width: 600px) {\n  .card {\n    padding:1rem\n  }\n}',
		);
	});

	it('preserves strings, comments, and separators inside functions', () => {
		expect(formatCss('.x{content:"a; {b}";background:url("data:image/a;b");/* note */--x: 1  2}')).toBe(
			'.x {\n  content:"a; {b}";\n  background:url("data:image/a;b");\n  /* note */--x: 1 2\n}',
		);
	});

	it('supports custom properties, brackets, and configurable indentation', () => {
		expect(formatCss(':root{--space: calc(1rem + 2px);--items: [a, b]}', 4)).toBe(
			':root {\n    --space: calc(1rem + 2px);\n    --items: [a, b]\n}',
		);
	});

	it('handles empty stylesheets and trailing declarations', () => {
		expect(formatCss('')).toBe('');
		expect(formatCss('.a { color: red }')).toBe('.a {\n  color: red\n}');
	});

	it('reports malformed strings, comments, delimiters, and blocks', () => {
		expect(() => formatCss('.a{content:"open}')).toThrow('unclosed string');
		expect(() => formatCss('.a{/* open')).toThrow('unclosed comment');
		expect(() => formatCss('.a{color:red')).toThrow('unclosed block');
		expect(() => formatCss('.a{color:red}}')).toThrow('unmatched closing brace');
		expect(() => formatCss('.a{width:calc(1px}')).toThrow('unclosed parenthesis');
		expect(() => formatCss('.a{color:red]', 2)).toThrow('unmatched closing bracket');
		expect(() => formatCss('.a{}', 0)).toThrow('between 1 and 8');
	});
});
