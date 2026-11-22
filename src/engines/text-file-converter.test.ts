// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import {
	convertTextFile,
	detectTextFileFormat,
	getTextFileExtension,
} from './text-file-converter';

describe('text file converter', () => {
	it('detects supported extensions without case sensitivity', () => {
		expect(detectTextFileFormat('NOTES.TXT')).toBe('text');
		expect(detectTextFileFormat('draft.markdown')).toBe('markdown');
		expect(detectTextFileFormat('page.HTM')).toBe('html');
		expect(detectTextFileFormat('data.csv')).toBeNull();
	});

	it('maps target formats to common file extensions', () => {
		expect(getTextFileExtension('text')).toBe('txt');
		expect(getTextFileExtension('markdown')).toBe('md');
		expect(getTextFileExtension('html')).toBe('html');
	});

	it('escapes plain text when converting to HTML and preserves paragraphs and line breaks', () => {
		expect(convertTextFile('A < B\nline two\n\nSecond paragraph', 'text', 'html'))
			.toBe('<p>A &lt; B<br>line two</p>\n<p>Second paragraph</p>');
	});

	it('renders Markdown to sanitized HTML and converts Markdown to readable text', () => {
		expect(convertTextFile('# Title\n\n**Bold** text', 'markdown', 'html'))
			.toContain('<h1>Title</h1>');
		expect(convertTextFile('# Title\n\n**Bold** text', 'markdown', 'text'))
			.toContain('Title\n\nBold text');
	});

	it('removes unsafe Markdown links and HTML from converted output', () => {
		const html = convertTextFile('[unsafe](javascript:alert(1))\n\n<script>alert(1)</script>', 'markdown', 'html');
		expect(html).not.toContain('<script');
		expect(html).not.toContain('javascript:');
	});

	it('sanitizes raw HTML before converting it to Markdown or plain text', () => {
		const source = '<h1>Title</h1><p>Hello <strong>world</strong>.</p><script>doBadThing()</script>';
		const markdown = convertTextFile(source, 'html', 'markdown');
		const plain = convertTextFile(source, 'html', 'text');
		expect(markdown).toContain('# Title');
		expect(markdown).toContain('**world**');
		expect(markdown).not.toContain('doBadThing');
		expect(plain).toContain('Title');
		expect(plain).toContain('Hello world.');
		expect(plain).not.toContain('doBadThing');
	});

	it('preserves source when the selected source and target formats match', () => {
		const source = '# unchanged\n';
		expect(convertTextFile(source, 'markdown', 'markdown')).toBe(source);
	});
});
