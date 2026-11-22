import { describe, expect, it } from 'vitest';
import { minifyCss } from './css-minifier';

describe('CSS minifier', () => {
	it('collapses whitespace around structural punctuation', () => {
		expect(minifyCss(' .card  {\n color : red ; margin : 0 , 1rem ;\n} '))
			.toBe('.card{color : red;margin : 0,1rem;}');
	});

	it('removes ordinary comments and preserves important comments', () => {
		expect(minifyCss('a { color: red; /* note */ background: blue } /*! license */'))
			.toBe('a{color: red;background: blue}/*! license */');
	});

	it('preserves strings, function spacing, and custom property values', () => {
		expect(minifyCss('.x { content: "a  b;{}"; width: calc(100% - 2rem); --layout: a  b }'))
			.toBe('.x{content: "a  b;{}";width: calc(100% - 2rem);--layout: a b}');
	});

	it('preserves selector whitespace and attribute strings', () => {
		expect(minifyCss('.card  .title, [data-label="a  b"] { color: red }'))
			.toBe('.card .title,[data-label="a  b"]{color: red}');
	});

	it('handles empty CSS and reports unbalanced constructs', () => {
		expect(minifyCss(' \n\t ')).toBe('');
		expect(() => minifyCss('.x { content: "open }')).toThrow('unclosed string');
		expect(() => minifyCss('.x { /* open')).toThrow('unclosed comment');
		expect(() => minifyCss('.x { width: calc(1px }')).toThrow('unclosed parenthesis');
		expect(() => minifyCss('.x { color: red ] }')).toThrow('unmatched closing bracket');
		expect(() => minifyCss('.x { color: red } }')).toThrow('unmatched closing brace');
		expect(() => minifyCss('.x { color: red')).toThrow('unclosed block');
	});
});
