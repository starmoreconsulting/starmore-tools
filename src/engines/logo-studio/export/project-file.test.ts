import { describe, expect, it } from 'vitest';
import { createDefaultElement, createDefaultProject } from '../model/types';
import { createProjectFile, validateLogoProject } from './project-file';

describe('validateLogoProject compatibility', () => {
	it('keeps legacy projects as logo projects when kind is absent', () => {
		const legacy = createDefaultProject('Legacy logo');

		expect(validateLogoProject(legacy)).toEqual(legacy);
	});

	it('accepts design project metadata and the contact/background element roles', () => {
		const project = createDefaultProject('Stationery');
		project.kind = 'design';
		project.brandName = 'Acme';
		project.generation = {
			layoutId: 'business-card-front:centered',
			seed: 0,
			paletteName: 'Acme',
			fontPair: { name: 'Acme', primary: 'Inter', secondary: 'Inter' },
			icon: '',
		};
		project.variants.primary = [
			createDefaultElement('shape', { role: 'background', shape: 'rectangle', width: 600, height: 600 }),
			createDefaultElement('text', { role: 'contact', fieldName: 'contact_email', text: 'team@example.com' }),
		];

		expect(validateLogoProject(project)).toEqual(project);
	});

	it('rejects unknown project kinds', () => {
		expect(() => validateLogoProject({ ...createDefaultProject(), kind: 'presentation' }))
			.toThrow('The project file has an invalid project kind.');
	});

	it('excludes mood board photos by default and preserves them when explicitly included', async () => {
		const project = createDefaultProject('Mood board');
		project.kind = 'design';
		project.generation = {
			layoutId: 'moodboard:square',
			seed: 1,
			paletteName: 'Test',
			fontPair: { name: 'Test', primary: 'Inter', secondary: 'Inter' },
			icon: '',
		};
		project.variants.primary = [
			createDefaultElement('image', {
				fieldName: 'moodboardImage',
				src: 'data:image/webp;base64,aGVsbG8=',
			}),
		];

		const excluded = validateLogoProject(JSON.parse(await (await createProjectFile(project)).text()));
		const included = validateLogoProject(JSON.parse(await (await createProjectFile(project, true)).text()));
		expect(excluded.variants.primary[0].src).toBeUndefined();
		expect(included.variants.primary[0].src).toBe('data:image/webp;base64,aGVsbG8=');
	});
});
