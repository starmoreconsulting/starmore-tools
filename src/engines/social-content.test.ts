import { describe, expect, it } from 'vitest';
import {
	fitVideoDimensions,
	formatCalendarCsv,
	formatCalendarIcs,
	generateSocialText,
} from './social-content';

describe('social content generators', () => {
	it('returns deterministic, topic-specific editable caption variants', () => {
		const input = { topic: 'ceramic glazing', audience: 'new potters', benefit: 'test colors on spare tiles' };
		const first = generateSocialText('caption', input);
		expect(first).toHaveLength(3);
		expect(first).toEqual(generateSocialText('caption', input));
		expect(first[0]).toContain('ceramic glazing');
		expect(first[1]).toContain('new potters');
		expect(new Set(first).size).toBe(3);
	});

	it('creates relevant hashtag choices from provided text without duplicate tags', () => {
		const [first] = generateSocialText('hashtag', { topic: 'Urban Gardening', industry: 'community gardens' });
		expect(first).toContain('#urban');
		expect(first).toContain('#gardening');
		expect(new Set(first.split(' ')).size).toBe(first.split(' ').length);
	});

	it('generates structured outlines and avoids claiming guaranteed results', () => {
		const [outline] = generateSocialText('blog-outline', { topic: 'home composting', audience: 'apartment residents', keyword: 'compost without a yard' });
		expect(outline).toContain('# Home Composting');
		expect(outline).toContain('Common questions');
		expect(outline).toContain('compost without a yard');
		const [videoTitle] = generateSocialText('youtube-title', { topic: 'home composting', audience: 'apartment gardeners', keyword: 'composting indoors' });
		expect(videoTitle).toContain('for Apartment Gardeners');
		expect(videoTitle).toContain('Composting Indoors');
		const [, ad] = generateSocialText('ad-copy', { product: 'reusable bottle', audience: 'hikers', goal: 'compare the available sizes' });
		expect(ad).toContain('Review the features, terms, and details');
		expect(ad).toContain('Compare the available sizes');
		expect(ad).not.toMatch(/guarantee|best-selling/i);
	});
});

describe('content calendar exports', () => {
	const entries = [
		{ date: '2026-03-04', platform: 'Blog, "weekly"', content: 'First line\nSecond line' },
	];

	it('quotes CSV fields and preserves multiline content', () => {
		expect(formatCalendarCsv(entries)).toBe(
			'"Date","Platform","Content"\r\n"2026-03-04","Blog, ""weekly""","First line\nSecond line"',
		);
	});

	it('formats an all-day ICS event and escapes text fields', () => {
		const calendar = formatCalendarIcs([{ ...entries[0], platform: 'Blog; weekly', content: 'First, line\nSecond\\line' }]);
		expect(calendar).toContain('DTSTART;VALUE=DATE:20260304');
		expect(calendar).toContain('DTEND;VALUE=DATE:20260305');
		expect(calendar).toContain('SUMMARY:Blog\\; weekly');
		expect(calendar).toContain('DESCRIPTION:First\\, line\\nSecond\\\\line');
		expect(calendar).toMatch(/^BEGIN:VCALENDAR[\s\S]*END:VCALENDAR$/);
	});

	it('omits entries without a valid date from ICS export', () => {
		expect(formatCalendarIcs([{ date: 'not-a-date', platform: 'Video', content: 'Post' }])).not.toContain('BEGIN:VEVENT');
		expect(formatCalendarIcs([{ date: '2026-02-31', platform: 'Video', content: 'Post' }])).not.toContain('BEGIN:VEVENT');
	});
});

describe('video aspect ratio fitting', () => {
	it('fits portrait and widescreen ratios within bounds using whole pixels', () => {
		expect(fitVideoDimensions(1920, 1080, '9:16')).toEqual({ width: 607, height: 1080 });
		expect(fitVideoDimensions(1080, 1920, '16:9')).toEqual({ width: 1080, height: 607 });
		expect(fitVideoDimensions(1000, 1000, '4:5')).toEqual({ width: 800, height: 1000 });
	});

	it('rejects zero, negative, and non-finite dimensions', () => {
		expect(() => fitVideoDimensions(0, 1080, '16:9')).toThrow('positive');
		expect(() => fitVideoDimensions(100, -1, '1:1')).toThrow('positive');
		expect(() => fitVideoDimensions(Number.NaN, 1, '1:1')).toThrow('positive');
	});
});
