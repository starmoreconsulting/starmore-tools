import { describe, expect, it } from 'vitest';
import { formatJavaScript } from './javascript-formatter';

describe('JavaScript formatter', () => {
	it('formats blocks, object properties, and nested statements', () => {
		expect(formatJavaScript('function greet(name){const value={text:"hi",count:2};if(value.count>0){return `${value.text}, ${name}!`}}')).toBe(
			'function greet(name) {\n  const value = {\n    text: "hi",\n    count: 2\n  };\n  if (value.count > 0) {\n    return `${value.text}, ${name}!`\n  }\n}',
		);
	});

	it('preserves comments, regex literals, and strings', () => {
		expect(formatJavaScript('const pattern=/[{};]/g;// keep this\nconst text="a; {b}";')).toBe(
			'const pattern = /[{};]/g;\n// keep this\nconst text = "a; {b}";',
		);
	});

	it('preserves line breaks that affect automatic semicolon insertion', () => {
		expect(formatJavaScript('function value(){return\nresult}')).toBe('function value() {\n  return\n  result\n}');
	});

	it('handles loops, arrays, and configurable indentation', () => {
		expect(formatJavaScript('for(let i=0;i<2;i++){items.push([i,i+1])}', 4)).toBe(
			'for (let i = 0; i < 2; i++) {\n    items.push([i, i + 1])\n}',
		);
	});

	it('handles empty input and reports malformed lexical structures', () => {
		expect(formatJavaScript('')).toBe('');
		expect(() => formatJavaScript('const value="open')).toThrow('unclosed string');
		expect(() => formatJavaScript('/* open')).toThrow('unclosed comment');
		expect(() => formatJavaScript('const value=`open')).toThrow('unclosed template literal');
		expect(() => formatJavaScript('function value( {')).toThrow('unclosed');
		expect(() => formatJavaScript('const value = )')).toThrow('unmatched closing parenthesis');
		expect(() => formatJavaScript('const value = ]')).toThrow('unmatched closing bracket');
		expect(() => formatJavaScript('const value = }')).toThrow('unmatched closing brace');
		expect(() => formatJavaScript('const value=1', 0)).toThrow('between 1 and 8');
	});
});
