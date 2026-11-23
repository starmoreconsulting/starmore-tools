import { describe, expect, it } from 'vitest';
import { buildLinkInBioHtml } from './link-in-bio';

describe('buildLinkInBioHtml', () => {
	it('creates a responsive standalone page and escapes user-controlled HTML', () => {
		const html = buildLinkInBioHtml('<Alex & Co>', 'A "short" bio', [
			{ label: '<Portfolio>', url: 'https://example.com/work?a=1&b=2' },
		]);

		expect(html).toContain('<meta name="viewport" content="width=device-width, initial-scale=1">');
		expect(html).toContain('<title>&lt;Alex &amp; Co&gt;</title>');
		expect(html).toContain('A &quot;short&quot; bio');
		expect(html).toContain('href="https://example.com/work?a=1&amp;b=2"');
		expect(html).toContain('&lt;Portfolio&gt;</a>');
		expect(html).toContain('rel="noopener noreferrer"');
		expect(html).not.toContain('<Portfolio>');
	});

	it('rejects unsafe and malformed link protocols', () => {
		expect(() => buildLinkInBioHtml('Title', '', [{ label: 'Run', url: 'javascript:alert(1)' }]))
			.toThrow('valid HTTP or HTTPS URL');
		expect(() => buildLinkInBioHtml('Title', '', [{ label: 'Broken', url: 'not a URL' }]))
			.toThrow('valid HTTP or HTTPS URL');
	});

	it('uses a default title and permits a page without links', () => {
		const html = buildLinkInBioHtml('', '', [{ label: '', url: '' }]);
		expect(html).toContain('<title>Your name or brand</title>');
		expect(html).toContain('<ul>\n\n    </ul>');
	});
});
