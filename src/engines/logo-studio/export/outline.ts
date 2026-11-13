import opentype from 'opentype.js';
import type { Element, LogoProject } from '../model/types';
import { getLogoFont } from '../library/fonts';

export interface TextOutline {
	elementId: string;
	pathData: string;
	markup: string;
	paths: { d: string; transform: string }[];
}

export interface TextGlyphPlacement {
	glyph: opentype.Glyph;
	centerX: number;
	centerY: number;
	rotation: number;
	advance: number;
}

export interface OutlineResult {
	outlines: Map<string, TextOutline>;
	warnings: string[];
}

const parsedFonts = new Map<string, Promise<opentype.Font>>();

function getOpenTypeFont(family: string, weight: number): Promise<opentype.Font> {
	const definition = getLogoFont(family);
	if (!definition) return Promise.reject(new Error(`“${family}” is not in the bundled font library.`));

	const actualWeight = weight >= 600 ? 700 : 400;
	const key = `${family}:${actualWeight}`;
	const cached = parsedFonts.get(key);
	if (cached) return cached;

	const src = actualWeight === 700 ? definition.bold : definition.regular;
	const loading = fetch(src)
		.then((response) => {
			if (!response.ok) throw new Error(`Font request failed (${response.status}).`);
			return response.arrayBuffer();
		})
		.then((buffer) => opentype.parse(buffer));
	parsedFonts.set(key, loading);
	loading.catch(() => parsedFonts.delete(key));
	return loading;
}

function escapeWarningText(value: string): string {
	return value.replace(/[\r\n]+/g, ' ').slice(0, 60);
}

export function layoutTextGlyphs(element: Element, font: opentype.Font): TextGlyphPlacement[] {
	const fontSize = Math.max(1, element.fontSize ?? 48);
	const lines = (element.text ?? '').split('\n');
	const lineHeight = Math.max(0, element.lineHeight ?? 1.16) * fontSize;
	const scale = fontSize / font.unitsPerEm;
	const baselineOffset = ((font.ascender + font.descender) / 2) * scale;
	const firstBaseline = element.height / 2 + baselineOffset - ((lines.length - 1) * lineHeight) / 2;
	const letterSpacing = element.letterSpacing ?? 0;
	const curve = Math.min(100, Math.max(-100, element.curve ?? 0)) / 100;
	const placements: TextGlyphPlacement[] = [];

	lines.forEach((line, lineIndex) => {
		const glyphs = Array.from(line, (character) => font.charToGlyph(character));
		const advances = glyphs.map((glyph, index) => {
			const next = glyphs[index + 1];
			const advance = (glyph.advanceWidth ?? font.unitsPerEm) * scale;
			return advance + (next ? font.getKerningValue(glyph, next) * scale + letterSpacing : 0);
		});
		const lineWidth = advances.reduce((total, advance) => total + advance, 0);
		const startX = element.align === 'left' ? 0
			: element.align === 'right' ? element.width - lineWidth
				: (element.width - lineWidth) / 2;
		const baseline = firstBaseline + lineIndex * lineHeight;
		const totalAngle = Math.abs(curve) * Math.PI;
		const radius = totalAngle > 0.0001 ? Math.max(1, lineWidth / totalAngle) : 0;
		let cursor = startX;

		glyphs.forEach((glyph, index) => {
			const advance = advances[index] - (glyphs[index + 1] ? font.getKerningValue(glyph, glyphs[index + 1]) * scale + letterSpacing : 0);
			const centerInLine = cursor - startX + advance / 2;
			if (radius === 0) {
				placements.push({ glyph, centerX: cursor + advance / 2, centerY: baseline, rotation: 0, advance });
			} else {
				const theta = (centerInLine - lineWidth / 2) / radius;
				const sign = Math.sign(curve);
				placements.push({
					glyph,
					centerX: startX + lineWidth / 2 + radius * Math.sin(theta),
					centerY: baseline + sign * radius * (1 - Math.cos(theta)),
					rotation: sign * theta * 180 / Math.PI,
					advance,
				});
			}
			cursor += advances[index];
		});
	});

	return placements;
}

async function outlineText(element: Element): Promise<TextOutline> {
	const font = await getOpenTypeFont(element.fontFamily ?? 'Inter', element.fontWeight ?? 400);
	const placements = layoutTextGlyphs(element, font);
	const paths = placements.map(({ glyph, centerX, centerY, rotation, advance }) => {
		const d = glyph.getPath(0, 0, Math.max(1, element.fontSize ?? 48)).toPathData(3);
		const transform = `translate(${centerX} ${centerY}) rotate(${rotation}) translate(${-advance / 2} 0)`;
		return { d, transform };
	});
	const pathData = paths.map((path) => path.d).join('');
	return {
		elementId: element.id,
		pathData,
		markup: paths.map((path) => `<path d="${path.d}" transform="${path.transform}"/>`).join(''),
		paths,
	};
}

function visitElements(elements: Element[], visit: (element: Element) => Promise<void>): Promise<void[]> {
	return Promise.all(elements.flatMap((element) => {
		const tasks = element.type === 'text' ? [visit(element)] : [];
		if (element.children) tasks.push(...visitElements(element.children, visit));
		return tasks;
	}));
}

export async function outlineProjectText(project: LogoProject): Promise<OutlineResult> {
	const outlines = new Map<string, TextOutline>();
	const warnings: string[] = [];
	const elements = Object.values(project.variants).flat();
	await visitElements(elements, async (element) => {
		try {
			outlines.set(element.id, await outlineText(element));
		} catch {
			warnings.push(`Could not load the bundled ${escapeWarningText(element.fontFamily ?? 'Inter')} font for “${escapeWarningText(element.text ?? 'text')}”. This text will remain editable in the SVG.`);
		}
	});
	return { outlines, warnings };
}
