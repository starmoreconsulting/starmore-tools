import { describe, expect, it } from 'vitest';
import { createEmptyBrandKit } from '../../logo-studio/brand/kit';
import { createDefaultElement, createDefaultProject } from '../../logo-studio/model/types';
import { generateDesign } from './generate';
import { resizeDesign } from './resize';

function sourceDesign() {
	const kit = createEmptyBrandKit('Resize brand');
	const logo = createDefaultProject('Resize logo');
	logo.variants.primary = [createDefaultElement('shape', {
		role: 'icon', shape: 'ellipse', x: 100, y: 120, width: 200, height: 100, fill: '#173B2E',
	})];
	kit.logo = logo;
	const project = generateDesign('instagram-post-square', 'centered', kit).project;
	return { kit, project };
}

describe('resizeDesign', () => {
	it('uniformly scales and centres content while backgrounds cover the target artboard', () => {
		const { project } = sourceDesign();
		const result = resizeDesign(project, 'instagram-story', 'scale');
		const background = result.project.variants.primary.find((element) => element.role === 'background');
		const logo = result.project.variants.primary.find((element) => element.role === 'icon');

		expect(result.project.artboard).toMatchObject({ width: 1080, height: 1920 });
		expect(background).toMatchObject({ x: 0, y: 0, width: 1080, height: 1920 });
		expect(logo && logo.width / logo.height).toBeCloseTo(2);
	});

	it('keeps element placement unchanged and expands the background when asked to Keep', () => {
		const { project } = sourceDesign();
		const originalLogo = project.variants.primary.find((element) => element.role === 'icon');
		const result = resizeDesign(project, 'instagram-story', 'keep');
		const resizedLogo = result.project.variants.primary.find((element) => element.role === 'icon');
		const background = result.project.variants.primary.find((element) => element.role === 'background');

		expect(resizedLogo && originalLogo && [resizedLogo.x, resizedLogo.y, resizedLogo.width, resizedLogo.height])
			.toEqual([originalLogo.x, originalLogo.y, originalLogo.width, originalLogo.height]);
		expect(background).toMatchObject({ width: 1080, height: 1920 });
	});

	it('regenerates an unedited design at the requested target size', () => {
		const { kit, project } = sourceDesign();
		const result = resizeDesign(project, { type: 'business-card-front', cardSize: '3.5x2in' }, 'regenerate', { kit });

		expect(result.mode).toBe('regenerate');
		expect(result.project.artboard).toMatchObject({ width: 88.9, height: 50.8 });
		expect(result.project.id).toBe(project.id);
	});

	it('falls back to Scale with an explanatory note for hand-edited designs', () => {
		const { kit, project } = sourceDesign();
		project.generation!.edited = true;
		const result = resizeDesign(project, 'instagram-story', 'regenerate', { kit });

		expect(result.mode).toBe('scale');
		expect(result.note).toMatch(/hand-edited/i);
	});

	it('falls back to Scale with a note when no kit is available for regeneration', () => {
		const { project } = sourceDesign();
		const result = resizeDesign(project, 'instagram-story', 'regenerate');

		expect(result.mode).toBe('scale');
		expect(result.note).toMatch(/active brand kit/i);
	});

	it('rejects logo projects', () => {
		expect(() => resizeDesign(createDefaultProject(), 'instagram-story', 'scale'))
			.toThrow('Only Brand Studio designs can be resized with this tool.');
	});
});
