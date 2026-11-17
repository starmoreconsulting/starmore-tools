import { describe, expect, it } from 'vitest';
import { createMoodBoardProject } from './project';
import { MOOD_BOARD_IMAGE_COUNTS, MOOD_BOARD_PRESETS } from './layouts';

const kit = {
	starmore_brand_kit: 1 as const,
	id: 'kit-1',
	name: 'Field Studio',
	createdAt: 1,
	updatedAt: 1,
	colors: [
		{ name: 'Forest', hex: '#203b32', role: 'primary' as const },
		{ name: 'Lime', hex: '#d7ed79', role: 'secondary' as const },
	],
	fonts: { heading: 'Inter', subheading: 'Manrope', body: 'Open Sans' },
	profile: {
		businessName: 'Field Studio',
		tagline: 'Thoughtful by nature',
		contactName: '',
		jobTitle: '',
		phone: '',
		email: '',
		website: '',
		address: '',
		socialHandles: { instagram: '', facebook: '', linkedin: '', youtube: '', x: '' },
	},
};

describe('mood board projects', () => {
	it('creates a shared design project with the requested image slots, palette, font sample, and keywords', () => {
		const project = createMoodBoardProject(kit, 'wide', 9, 'calm, outdoors');
		const elements = project.variants.primary;
		expect(project.kind).toBe('design');
		expect(project.generation?.layoutId).toBe('moodboard:wide');
		expect(project.artboard).toMatchObject({ width: 1600, height: 900 });
		expect(elements.filter((element) => element.fieldName === 'moodboardImage')).toHaveLength(9);
		expect(elements.filter((element) => element.fieldName === 'moodboardSwatch')).toHaveLength(5);
		expect(elements.find((element) => element.fieldName === 'moodboard-keywords')?.text).toBe('calm  ·  outdoors');
		expect(elements.find((element) => element.fieldName === 'moodboard-font-sample')?.fontFamily).toBe('Inter');
	});

	it('uses A4 landscape dimensions and rejects unsupported image counts', () => {
		const project = createMoodBoardProject(kit, 'a4-landscape', 3);
		expect(project.artboard).toMatchObject({ width: 3508, height: 2480 });
		expect(() => createMoodBoardProject(kit, 'square', 2)).toThrow('between 3 and 9');
	});

	it('keeps every generated image cell inside each artboard without overlapping another cell', () => {
		for (const preset of Object.keys(MOOD_BOARD_PRESETS)) {
			for (const count of MOOD_BOARD_IMAGE_COUNTS) {
				const project = createMoodBoardProject(kit, preset, count);
				const cells = project.variants.primary.filter((element) => element.fieldName === 'moodboardImage');
				for (const cell of cells) {
					expect(cell.x).toBeGreaterThanOrEqual(0);
					expect(cell.y).toBeGreaterThanOrEqual(0);
					expect(cell.x + cell.width).toBeLessThanOrEqual(project.artboard.width);
					expect(cell.y + cell.height).toBeLessThanOrEqual(project.artboard.height);
				}
				for (let first = 0; first < cells.length; first += 1) {
					for (let second = first + 1; second < cells.length; second += 1) {
						const a = cells[first];
						const b = cells[second];
						expect(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y).toBe(true);
					}
				}
			}
		}
	});
});
