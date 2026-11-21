import { describe, expect, it } from 'vitest';
import { generateEmailSignature, escapeHtml } from './email-signature';

describe('generateEmailSignature', () => {
	it('generates escaped HTML', () => {
		const html = generateEmailSignature({ name: 'A <B>', title: '', company: 'Studio', email: 'a@example.com', phone: '', website: 'example.com', colour: '#356b54' });
		expect(html).toContain('A &lt;B&gt;');
		expect(html).toContain('mailto:a@example.com');
		expect(html).toContain('https://example.com');
	});

	it('escapes HTML entities', () => {
		expect(escapeHtml('A&B <C> "D"')).toBe('A&amp;B &lt;C&gt; &quot;D&quot;');
	});

	it('falls back to a safe colour', () => {
		expect(generateEmailSignature({ name: '', title: '', company: '', email: '', phone: '', website: '', colour: 'url(javascript:bad)' })).toContain('#356b54');
	});
});
