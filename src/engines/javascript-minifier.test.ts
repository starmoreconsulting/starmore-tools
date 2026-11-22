import { describe, expect, it } from 'vitest';
import { minifyJavaScript } from './javascript-minifier';

describe('JavaScript minifier', () => {
	it('removes ordinary comments and redundant whitespace', () => {
		expect(minifyJavaScript('  const value = { answer: 42 };  // remove me\n console.log(value.answer);  '))
			.toBe('const value={answer:42};\nconsole.log(value.answer);');
	});

	it('preserves string, template, regex, and license comment contents', () => {
		expect(minifyJavaScript('/*! license */ const text = `a  b ${value}`; const pattern = /[{};]/g; const s = "x  y";'))
			.toBe('/*! license */ const text=`a  b ${value}`;const pattern=/[{};]/g;const s="x  y";');
	});

	it('preserves line breaks that may affect automatic semicolon insertion', () => {
		expect(minifyJavaScript('function value() {\n return\n result\n}'))
			.toBe('function value(){\nreturn\nresult\n}');
	});

	it('keeps token boundaries that would otherwise form a different operator', () => {
		expect(minifyJavaScript('const a = x + +y; const b = x - --y;'))
			.toBe('const a=x+ +y;const b=x- --y;');
	});

	it('handles regex after a keyword and nested template expressions', () => {
		expect(minifyJavaScript('function test(value) { return /a+/.test(`${value}`); }'))
			.toBe('function test(value){return /a+/.test(`${value}`);}');
	});

	it('handles empty input and reports malformed lexical structures', () => {
		expect(minifyJavaScript(' \n\t ')).toBe('');
		expect(() => minifyJavaScript('const value="open')).toThrow('unclosed string');
		expect(() => minifyJavaScript('/* open')).toThrow('unclosed comment');
		expect(() => minifyJavaScript('const value=`open')).toThrow('unclosed template literal');
	});
});
