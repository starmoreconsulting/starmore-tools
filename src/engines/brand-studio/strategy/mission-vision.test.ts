import { describe, expect, it } from 'vitest';
import { generateMissionVision } from './mission-vision';

describe('mission and vision templates', () => {
	it('creates three complete style variants from complete answers', () => {
		const result = generateMissionVision({
			who: 'local makers', what: 'build useful spaces', how: 'thoughtful design', why: 'communities thrive',
		});
		expect(Object.keys(result.mission)).toEqual(['plain', 'inspiring', 'concise']);
		expect(Object.keys(result.vision)).toEqual(['plain', 'inspiring', 'concise']);
		expect(Object.values(result.mission).every((text) => text.includes('local makers'))).toBe(true);
	});

	it('shortens missing answers without leaving template slots', () => {
		const result = generateMissionVision({ who: '', what: '', how: '', why: '' });
		for (const text of [...Object.values(result.mission), ...Object.values(result.vision)]) {
			expect(text).not.toMatch(/\[[^\]]+\]|\{[^}]+\}/);
			expect(text.trim().length).toBeGreaterThan(0);
		}
	});
});
