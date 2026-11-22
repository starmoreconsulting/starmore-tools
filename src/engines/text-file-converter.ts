import DOMPurify from 'dompurify';
import { marked } from 'marked';
import TurndownService from 'turndown';

export const TEXT_FILE_CONVERTER_MAX_BYTES = 5_000_000;

export type TextFileFormat = 'text' | 'markdown' | 'html';

const blockTags = new Set([
	'ADDRESS', 'ARTICLE', 'ASIDE', 'BLOCKQUOTE', 'DIV', 'DL', 'FIELDSET', 'FIGCAPTION',
	'FIGURE', 'FOOTER', 'FORM', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'HEADER', 'HR',
	'LI', 'MAIN', 'NAV', 'OL', 'P', 'PRE', 'SECTION', 'TABLE', 'TR', 'UL',
]);

function escapeHtml(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

function plainTextToHtml(text: string): string {
	const normalized = text.replace(/\r\n?/g, '\n');
	return normalized.split(/\n{2,}/).map((paragraph) => (
		`<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`
	)).join('\n');
}

function htmlToPlainText(html: string): string {
	const sanitized = DOMPurify.sanitize(html);
	const parsed = new DOMParser().parseFromString(sanitized, 'text/html');
	parsed.querySelectorAll('script, style, noscript, template, svg, iframe, object').forEach((node) => node.remove());

	const renderNode = (node: Node): string => {
		if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';
		if (!(node instanceof Element)) return '';
		if (node.tagName === 'BR') return '\n';
		const content = Array.from(node.childNodes, renderNode).join('');
		if (node.tagName === 'LI') return `• ${content.trim()}\n`;
		return blockTags.has(node.tagName) ? `${content.trim()}\n\n` : content;
	};

	return Array.from(parsed.body.childNodes, renderNode)
		.join('')
		.replace(/[ \t]+\n/g, '\n')
		.replace(/\n{3,}/g, '\n\n')
		.trim();
}

export function detectTextFileFormat(fileName: string): TextFileFormat | null {
	const extension = fileName.slice(fileName.lastIndexOf('.') + 1).toLowerCase();
	if (extension === 'txt' || extension === 'text') return 'text';
	if (extension === 'md' || extension === 'markdown' || extension === 'mdown') return 'markdown';
	if (extension === 'html' || extension === 'htm') return 'html';
	return null;
}

export function getTextFileExtension(format: TextFileFormat): string {
	if (format === 'markdown') return 'md';
	if (format === 'html') return 'html';
	return 'txt';
}

export function convertTextFile(source: string, from: TextFileFormat, to: TextFileFormat): string {
	if (from === to) return source;

	if (from === 'text') {
		return to === 'html' ? plainTextToHtml(source) : source;
	}

	if (from === 'markdown') {
		const rendered = marked.parse(source, { async: false, breaks: true });
		if (typeof rendered !== 'string') throw new Error('Could not render the Markdown content.');
		const sanitized = DOMPurify.sanitize(rendered);
		return to === 'html' ? sanitized : htmlToPlainText(sanitized);
	}

	if (to === 'markdown') {
		const sanitized = DOMPurify.sanitize(source);
		return new TurndownService({ bulletListMarker: '-', headingStyle: 'atx' }).turndown(sanitized);
	}
	return htmlToPlainText(source);
}
