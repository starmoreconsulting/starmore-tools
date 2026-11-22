// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { extractWordPdfBlocks } from './word-to-pdf';

describe('extractWordPdfBlocks', () => {
	it('extracts headings, paragraphs, lists and table rows', () => {
		const blocks = extractWordPdfBlocks(`
			<h1>Report</h1>
			<p>Opening paragraph.</p>
			<ul><li>First item</li><li>Second item</li></ul>
			<table><tr><th>Name</th><th>Value</th></tr><tr><td>One</td><td>2</td></tr></table>
		`);
		expect(blocks).toContainEqual({ type: 'heading', level: 1, text: 'Report' });
		expect(blocks).toContainEqual({ type: 'paragraph', text: 'Opening paragraph.' });
		expect(blocks).toContainEqual({ type: 'list-item', text: 'First item' });
		expect(blocks).toContainEqual({ type: 'table-row', cells: ['Name', 'Value'] });
		expect(blocks).toContainEqual({ type: 'table-row', cells: ['One', '2'] });
	});

	it('extracts embedded image data URLs', () => {
		const blocks = extractWordPdfBlocks('<p>Before</p><img src="data:image/png;base64,AAAA" alt="Logo"><p>After</p>');
		expect(blocks).toContainEqual({ type: 'image', src: 'data:image/png;base64,AAAA', alt: 'Logo' });
	});
});
