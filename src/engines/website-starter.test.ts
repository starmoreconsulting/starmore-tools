import { describe, expect, it } from 'vitest';
import { generateWebsiteStarter } from './website-starter';

describe('generateWebsiteStarter', () => {
	it('generates escaped HTML and CSS', () => {
		const result = generateWebsiteStarter({ brand: 'A&B', title: 'Hello <world>', description: 'Clear copy', primary: '#356b54', background: '#ffffff' });
		expect(result.html).toContain('A&amp;B');
		expect(result.html).toContain('Hello &lt;world&gt;');
		expect(result.css).toContain('--primary:#356b54');
	});

	it('falls back to safe brand colours', () => {
		const result = generateWebsiteStarter({ brand: '', title: '', description: '', primary: 'url(bad)', background: 'javascript:bad' });
		expect(result.css).toContain('--primary:#356b54');
		expect(result.css).toContain('--background:#f7f8f4');
	});
});
