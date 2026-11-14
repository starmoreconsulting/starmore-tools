import { describe, expect, it } from 'vitest';
import { createDefaultElement, createDefaultProject } from '../model/types';
import { validateLogoProject } from './project-file';

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
});
