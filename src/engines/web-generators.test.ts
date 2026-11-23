import { describe, expect, it } from 'vitest';
import {
	buildBorderRadiusCss,
	buildButtonCode,
	buildMetaTags,
	buildOpenGraphTags,
	buildRobotsTxt,
	buildSitemapXml,
	convertCssColor,
	parseCssColor,
} from './web-generators';

describe('CSS colour conversion', () => {
	it('converts common hex, RGB and HSL forms, including alpha', () => {
		expect(convertCssColor('#0af')).toEqual({ HEX: '#00aaff', RGB: 'rgb(0, 170, 255)', HSL: 'hsl(200 100% 50%)' });
		expect(convertCssColor('rgba(255, 0, 10, 50%)').RGB).toBe('rgba(255, 0, 10, 0.5)');
		expect(convertCssColor('hsl(0.5turn 100% 50% / 25%)').HEX).toBe('#00ffff40');
		expect(parseCssColor('#1234').alpha).toBeCloseTo(0x44 / 255);
		expect(convertCssColor('rgb(100% 0% 50%)').HEX).toBe('#ff0080');
	});

	it('rejects malformed or out-of-range values rather than partially parsing', () => {
		for (const value of ['#12', 'rgb(1, 2)', 'rgb(300 0 0)', 'hsl(20 120% 50%)', 'rgba(0,0,0)', 'rgb(0,0,0 / .5)']) {
			expect(() => parseCssColor(value), value).toThrow();
		}
	});
});

describe('web generators', () => {
	it('builds border radius CSS and validates dimensions', () => {
		expect(buildBorderRadiusCss({ topLeft: 1, topRight: 2, bottomRight: 3, bottomLeft: 4, unit: 'px' })).toBe('border-radius: 1px 2px 3px 4px;');
		expect(() => buildBorderRadiusCss({ topLeft: -1, topRight: 2, bottomRight: 3, bottomLeft: 4, unit: '%' })).toThrow();
	});

	it('builds button markup and CSS while escaping the label', () => {
		const button = buildButtonCode({ label: '<Click & go>', background: '#123456', text: '#ffffff', hoverBackground: '#234567', border: '#000000', radius: 8, paddingVertical: 10, paddingHorizontal: 20 });
		expect(button.html).toContain('&lt;Click &amp; go&gt;');
		expect(button.css).toContain('padding: 10px 20px;');
		expect(() => buildButtonCode({ label: 'x', background: 'red', text: '#fffFFF', hoverBackground: '#234567', border: '#000000', radius: 8, paddingVertical: 10, paddingHorizontal: 20 })).toThrow();
	});

	it('escapes metadata and validates canonical addresses', () => {
		expect(buildMetaTags({ title: '<title>', description: 'A & B' })).toBe('<title>&lt;title&gt;</title>\n<meta name="description" content="A &amp; B">');
		expect(() => buildMetaTags({ title: 'Page', canonicalUrl: 'javascript:alert(1)' })).toThrow();
	});

	it('generates robots rules with validated paths and sitemap URL', () => {
		expect(buildRobotsTxt({ userAgent: '*', disallow: '/private\n/tmp', allow: '/', sitemapUrl: 'https://example.test/sitemap.xml', crawlDelay: 5 })).toBe('User-agent: *\nDisallow: /private\nDisallow: /tmp\nAllow: /\nCrawl-delay: 5\nSitemap: https://example.test/sitemap.xml\n');
		expect(() => buildRobotsTxt({ userAgent: '*', disallow: 'private', allow: '', sitemapUrl: '' })).toThrow();
	});

	it('generates escaped sitemap XML and validates entries', () => {
		const xml = buildSitemapXml([{ url: 'https://example.test/?a=1&b=2', lastModified: '2025-01-31', changeFrequency: 'weekly', priority: '0.8' }]);
		expect(xml).toContain('<loc>https://example.test/?a=1&amp;b=2</loc>');
		expect(xml).toContain('<priority>0.8</priority>');
		expect(() => buildSitemapXml([{ url: 'https://example.test', lastModified: '2025-02-31' }])).toThrow();
	});

	it('builds Open Graph tags without requiring a network fetch', () => {
		expect(buildOpenGraphTags({ title: 'A & B', description: 'Summary', imageUrl: '', pageUrl: '' })).toContain('content="A &amp; B"');
		expect(() => buildOpenGraphTags({ title: 'Page', description: '', imageUrl: 'file:///image.png', pageUrl: '' })).toThrow();
	});
});
