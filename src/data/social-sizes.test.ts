import { describe, expect, it } from 'vitest';
import { socialSizesLastChecked, socialSizePresets, socialSizeSources, socialSizeSourceNote } from './social-sizes';

describe('social image size reference data', () => {
	it('labels each current-known preset with its platform, placement, and pixel dimensions', () => {
		const sizes = Object.fromEntries(socialSizePresets.map(({ id, width, height }) => [id, [width, height]]));
		expect(sizes).toEqual({
			'instagram-square': [1080, 1080],
			'instagram-portrait': [1080, 1350],
			'instagram-story': [1080, 1920],
			'facebook-post': [1200, 630],
			'facebook-cover': [1640, 624],
			'youtube-thumbnail': [1280, 720],
			'youtube-banner': [2560, 1440],
			'linkedin-post': [1200, 1200],
			'linkedin-banner': [1584, 396],
			'x-post': [1600, 900],
			'x-header': [1500, 500],
			'whatsapp-status': [1080, 1920],
			'whatsapp-profile': [640, 640],
		});
		expect(new Set(socialSizePresets.map((preset) => preset.id)).size).toBe(socialSizePresets.length);
		expect(socialSizePresets.every((preset) => preset.width > 0 && preset.height > 0 && preset.platform && preset.name)).toBe(true);
	});

	it('includes a check date, a change caveat, and platform source links', () => {
		expect(socialSizesLastChecked).toMatch(/^\d{4}-\d{2}-\d{2}$/);
		expect(socialSizeSourceNote).toMatch(/change|vary/i);
		expect(socialSizeSources.map((source) => source.id)).toEqual(expect.arrayContaining(['instagram', 'facebook', 'youtube', 'linkedin', 'x', 'whatsapp']));
		expect(socialSizePresets.every((preset) => socialSizeSources.some((source) => source.id === preset.sourceId))).toBe(true);
		expect(socialSizeSources.every((source) => source.url.startsWith('https://'))).toBe(true);
	});
});
