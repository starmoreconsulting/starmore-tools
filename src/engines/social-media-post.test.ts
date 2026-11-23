import { describe, expect, it } from 'vitest';
import { createSocialMediaPostScene, createSocialMediaPostSvg, type SocialMediaPostOptions } from './social-media-post';

const options: SocialMediaPostOptions = {
	width: 1200,
	height: 630,
	title: 'A clear message',
	body: 'Make your next idea easy to share.',
	footer: '@example',
	backgroundColor: '#f5f0e8',
	accentColor: '#b95236',
	textColor: '#20211f',
	layout: 'centered',
	fontSize: 88,
};

describe('social media post output', () => {
	it('builds a vector image with the selected dimensions, colors, and readable text', () => {
		const svg = createSocialMediaPostSvg(options);
		expect(svg).toContain('width="1200" height="630" viewBox="0 0 1200 630"');
		expect(svg).toContain('fill="#f5f0e8"');
		expect(svg).toContain('fill="#b95236"');
		expect(svg).toContain('A clear message');
		expect(svg).toContain('@example');
		expect(svg).toContain('aria-labelledby="post-title"');
	});

	it('escapes user text and falls back from invalid colors', () => {
		const svg = createSocialMediaPostSvg({
			...options,
			title: '<script>alert("x")</script>',
			backgroundColor: 'red;fill:url(javascript:alert(1))',
		});
		expect(svg).toContain('&lt;script&gt;');
		expect(svg).toContain('&quot;x&quot;');
		expect(svg).not.toContain('<script>');
		expect(svg).toContain('fill="#f5f0e8"');
	});

	it('creates distinct layouts, wraps long copy, and limits oversized dimensions', () => {
		const centered = createSocialMediaPostScene({ ...options, width: 0, height: 9000 });
		const editorial = createSocialMediaPostScene({ ...options, layout: 'editorial', title: 'long headline '.repeat(24) });
		expect(centered.width).toBe(1);
		expect(centered.height).toBe(4096);
		expect(editorial.shapes.some((shape) => shape.type === 'circle')).toBe(true);
		expect(editorial.text.some((line) => line.text.includes('…'))).toBe(true);
	});
});
