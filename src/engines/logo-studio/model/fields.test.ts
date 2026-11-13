import { describe, expect, it } from 'vitest';
import { createDefaultElement, createDefaultProject, type Element } from './types';
import { collectFields, fillFields } from './fields';

function makeProject(elements: Element[]): ReturnType<typeof createDefaultProject> {
	return {
		...createDefaultProject('Fields test'),
		variants: { primary: elements, secondary: structuredClone(elements) },
	};
}

describe('collectFields', () => {
	it('collects unique text and image fields through groups and variants', () => {
		const name = createDefaultElement('text', { fieldName: 'name', text: 'Acorn' });
		const group = createDefaultElement('group', {
			children: [
				createDefaultElement('text', { fieldName: 'name', text: 'Different name' }),
				createDefaultElement('image', { fieldName: 'product-image', src: 'data:image/png;base64,AA==' }),
				createDefaultElement('shape', { fieldName: 'ignored' }),
			],
		});
		const fields = collectFields(makeProject([name, group]));
		expect(fields).toEqual([
			{ name: 'name', type: 'text', value: 'Acorn', variants: ['primary', 'secondary'] },
			{ name: 'product-image', type: 'image', value: 'data:image/png;base64,AA==', variants: ['primary', 'secondary'] },
		]);
	});

	it('ignores a field name that contains only whitespace', () => {
		const text = createDefaultElement('text', { fieldName: '   ' });
		expect(collectFields(makeProject([text]))).toEqual([]);
	});
});

describe('fillFields', () => {
	it('fills duplicate field names in groups and across variants without mutating the source', () => {
		const project = makeProject([
			createDefaultElement('group', {
				children: [createDefaultElement('text', { fieldName: 'name', text: 'Acorn' })],
			}),
		]);
		const original = structuredClone(project);
		const result = fillFields(project, { name: 'New name', absent: 'ignored' });

		expect(result.filled).toEqual(['name']);
		expect(result.unmatched).toEqual(['absent']);
		expect(result.project.variants.primary[0].children?.[0].text).toBe('New name');
		expect(result.project.variants.secondary[0].children?.[0].text).toBe('New name');
		expect(project).toEqual(original);
		expect(result.project).not.toBe(project);
	});

	it('allows empty text and stringifies numeric values', () => {
		const text = createDefaultElement('text', { fieldName: 'name', text: 'Acorn' });
		const project = makeProject([text]);
		expect(fillFields(project, { name: '' }).project.variants.primary[0].text).toBe('');
		expect(fillFields(project, { name: 42 }).project.variants.primary[0].text).toBe('42');
	});

	it('fits text where possible and reports overflow for very long text', () => {
		const text = createDefaultElement('text', {
			fieldName: 'name',
			text: 'Acorn',
			width: 120,
			height: 36,
			fontSize: 48,
		});
		const result = fillFields(makeProject([text]), { name: 'A very long business name that cannot fit in this small box' });

		expect(result.project.variants.primary[0].text).toContain('\n');
		expect(result.project.variants.primary[0].fontSize).toBe(8);
		expect(result.warnings).toContain('The “name” text does not fit its box at the minimum font size.');
	});

	it('handles emoji text without throwing or changing the original', () => {
		const project = makeProject([createDefaultElement('text', { fieldName: 'name', text: 'Brand' })]);
		const original = structuredClone(project);
		const result = fillFields(project, { name: '🌱✨' });

		expect(result.project.variants.primary[0].text).toBe('🌱✨');
		expect(result.warnings).toEqual([]);
		expect(project).toEqual(original);
	});

	it('replaces image sources and preserves the element box and fit rule', () => {
		const image = createDefaultElement('image', {
			fieldName: 'photo',
			src: 'data:image/png;base64,AA==',
			fit: 'cover',
			width: 320,
			height: 180,
		});
		const result = fillFields(makeProject([image]), { photo: 'data:image/jpeg;base64,AQ==' });
		const filled = result.project.variants.primary[0];

		expect(filled.src).toBe('data:image/jpeg;base64,AQ==');
		expect(filled.fit).toBe('cover');
		expect([filled.width, filled.height]).toEqual([320, 180]);
	});
});
