// @vitest-environment jsdom
import opentype from 'opentype.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDefaultElement, createDefaultProject } from '../model/types';
import { outlineProjectText } from './outline';
import { exportProjectToSvg } from './svg';

function fakeFont(): opentype.Font {
	return {
		unitsPerEm: 1000,
		ascender: 800,
		descender: -200,
		charToGlyph(character: string) {
			const codePoint = character.codePointAt(0) ?? 0;
			const supported = codePoint <= 0x024f || /\s/.test(character);
			return {
				index: supported ? Math.max(1, codePoint) : 0,
				advanceWidth: 600,
				getPath() {
					return { toPathData: () => 'M0 0' };
				},
			} as unknown as opentype.Glyph;
		},
		getKerningValue: () => 0,
	} as unknown as opentype.Font;
}

function textProject(text: string) {
	const project = createDefaultProject('Outline test');
	project.variants.primary = [
		createDefaultElement('text', { text, fontFamily: 'Inter', width: 500, height: 100 }),
	];
	return project;
}

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

describe('outlineProjectText', () => {
	it.each([
		['emoji', 'Harbor 🌿 Studio'],
		['CJK', '李明 Studio'],
		['Arabic', 'مرحبا Studio'],
		['combining accent', 'Cafe\u0301 Studio'],
		['mixed text', 'Harbor 李明 🌿'],
		['empty text', ''],
		['very long text', 'Harbor Studio '.repeat(500)],
	])('does not throw for %s', async (_label, text) => {
		vi.stubGlobal('fetch', vi.fn(async () => ({
			ok: true,
			arrayBuffer: async () => new ArrayBuffer(8),
		})));
		vi.spyOn(opentype, 'parse').mockReturnValue(fakeFont());

		await expect(outlineProjectText(textProject(text))).resolves.toMatchObject({
			outlines: expect.any(Map),
			unsupportedChars: expect.any(Array),
			elementsAffected: expect.any(Array),
		});
	});

	it('keeps unsupported characters live in SVG and reports them', async () => {
		vi.stubGlobal('fetch', vi.fn(async () => ({
			ok: true,
			arrayBuffer: async () => new ArrayBuffer(8),
		})));
		vi.spyOn(opentype, 'parse').mockReturnValue(fakeFont());

		const result = await exportProjectToSvg(textProject('Harbor 🌿 Studio'), { outlineText: true });

		expect(result.svg).toContain('<text');
		expect(result.svg).toContain('Harbor 🌿 Studio');
		expect(result.unsupportedChars).toContain('🌿');
		expect(result.elementsAffected).toHaveLength(1);
	});
});
