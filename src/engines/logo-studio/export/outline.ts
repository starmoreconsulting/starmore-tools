import opentype from 'opentype.js';
import type { Element, LogoProject } from '../model/types';
import { getLogoFont, logoFonts } from '../library/fonts';
import { getCustomFont } from '../store/custom-fonts';

export interface TextOutline {
	elementId: string;
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

function finiteOr(value: number | undefined, fallback: number): number {
	return value !== undefined && Number.isFinite(value) ? value : fallback;
}

const parsedFonts = new Map<string, Promise<opentype.Font>>();
const textFontCache = new Map<string, Promise<{ font: opentype.Font; family: string }>>();

function getOpenTypeFont(family: string, weight: number): Promise<opentype.Font> {
	const definition = getLogoFont(family);

	const actualWeight = weight >= 600 ? 700 : 400;
	const key = `${family}:${actualWeight}`;
	const cached = parsedFonts.get(key);
	if (cached) return cached;

	const loading = definition
		? fetch(actualWeight === 700 ? definition.bold : definition.regular)
			.then((response) => {
				if (!response.ok) throw new Error(`Font request failed (${response.status}).`);
				return response.arrayBuffer();
			})
			.then((buffer) => opentype.parse(buffer))
		: getCustomFont(family).then((stored) => {
			if (!stored) throw new Error(`Missing custom font: “${family}”. Upload it again to outline this text.`);
			return stored.blob.arrayBuffer().then((buffer) => opentype.parse(buffer));
		});
	parsedFonts.set(key, loading);
	loading.catch(() => parsedFonts.delete(key));
	return loading;
}

function escapeWarningText(value: string): string {
	return value.replace(/[\r\n]+/g, ' ').slice(0, 60);
}

function fontContainsText(font: opentype.Font, text: string): boolean {
	const missingGlyphIndex = font.charToGlyph('\u{10FFFF}').index;
	return Array.from(text.normalize('NFC')).every((character) => {
		const codePoint = character.codePointAt(0) ?? 0;
		if (/\s/.test(character) || codePoint === 0x200d || (codePoint >= 0xfe00 && codePoint <= 0xfe0f)) return true;
		const glyphIndex = font.charToGlyph(character).index;
		return glyphIndex !== 0 && glyphIndex !== missingGlyphIndex;
	});
}

function getFontForText(family: string, weight: number, text: string): Promise<{ font: opentype.Font; family: string }> {
	const key = `${family}:${weight}:${text}`;
	const cached = textFontCache.get(key);
	if (cached) return cached;

	const loading = (async () => {
		let preferred: opentype.Font | undefined;
		try {
			preferred = await getOpenTypeFont(family, weight);
			if (fontContainsText(preferred, text)) return { font: preferred, family };
		} catch (cause) {
			if (!getLogoFont(family)) throw cause;
			preferred = undefined;
		}

		const fallbacks = ['Inter', 'Open Sans', 'Lora']
			.filter((candidate) => candidate !== family && logoFonts.some((font) => font.family === candidate));
		for (const fallback of fallbacks) {
			try {
				const font = await getOpenTypeFont(fallback, weight);
				if (fontContainsText(font, text)) return { font, family: fallback };
			} catch {
				continue;
			}
		}
		throw new Error('No bundled font contains every character.');
	})();
	textFontCache.set(key, loading);
	loading.catch(() => textFontCache.delete(key));
	return loading;
}

export function layoutTextGlyphs(element: Element, font: opentype.Font): TextGlyphPlacement[] {
	const fontSize = Math.max(1, finiteOr(element.fontSize, 48));
	const width = finiteOr(element.width, 0);
	const height = finiteOr(element.height, 0);
	const lines = (element.text ?? '').split('\n');
	const lineHeight = Math.max(0, finiteOr(element.lineHeight, 1.16)) * fontSize;
	const scale = fontSize / font.unitsPerEm;
	const baselineOffset = ((font.ascender + font.descender) / 2) * scale;
	const firstBaseline = height / 2 + baselineOffset - ((lines.length - 1) * lineHeight) / 2;
	const letterSpacing = finiteOr(element.letterSpacing, 0);
	const curve = Math.min(100, Math.max(-100, finiteOr(element.curve, 0))) / 100;
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
			: element.align === 'right' ? width - lineWidth
				: (width - lineWidth) / 2;
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

async function outlineText(element: Element): Promise<{ outline: TextOutline; warning?: string }> {
	const preferredFamily = element.fontFamily ?? 'Inter';
	const text = element.text ?? '';
	const { font, family } = await getFontForText(preferredFamily, element.fontWeight ?? 400, text);
	const placements = layoutTextGlyphs(element, font);
	if (!Number.isFinite(font.unitsPerEm) || font.unitsPerEm <= 0) {
		throw new Error('The bundled font has invalid metrics.');
	}
	const fontSize = Math.max(1, finiteOr(element.fontSize, 48));
	const scale = fontSize / font.unitsPerEm;
	const paths = placements.map(({ glyph, centerX, centerY, rotation, advance }) => {
		if (![centerX, centerY, rotation, advance].every(Number.isFinite)) {
			throw new Error('Text layout produced invalid coordinates.');
		}
		const d = glyph.getPath(0, 0, font.unitsPerEm).toPathData(3);
		if (/(?:NaN|Infinity)/i.test(d)) {
			throw new Error('The bundled font produced invalid outline data.');
		}
		const transform = `translate(${centerX} ${centerY}) rotate(${rotation}) translate(${-advance / 2} 0) scale(${scale})`;
		return { d, transform };
	});
	return {
		outline: {
			elementId: element.id,
			markup: paths.map((path) => `<path d="${path.d}" transform="${path.transform}"/>`).join(''),
			paths,
		},
		...(family !== preferredFamily ? {
			warning: `The “${escapeWarningText(preferredFamily)}” font does not include every character in “${escapeWarningText(text)}”. The bundled ${family} font was used instead.`,
		} : {}),
	};
}

async function visitElements(elements: Element[], visit: (element: Element) => Promise<void>): Promise<void> {
	await Promise.all(elements.map(async (element) => {
		if (element.type === 'text') await visit(element);
		if (element.children) await visitElements(element.children, visit);
	}));
}

export async function outlineProjectText(project: LogoProject, curvedOnly = false): Promise<OutlineResult> {
	const outlines = new Map<string, TextOutline>();
	const warnings: string[] = [];
	const elements = Object.values(project.variants).flat();
	await visitElements(elements, async (element) => {
		if (curvedOnly && !element.curve) return;
		try {
			const result = await outlineText(element);
			outlines.set(element.id, result.outline);
			if (result.warning) warnings.push(result.warning);
		} catch (cause) {
			const text = escapeWarningText(element.text ?? 'text');
			if (cause instanceof Error && cause.message === 'No bundled font contains every character.') {
				warnings.push(`No bundled font contains every character in “${text}”. The text remains editable and the browser's system fallback will be used.`);
			} else if (cause instanceof Error && cause.message.startsWith('Missing custom font:')) {
				warnings.push(`${cause.message} The text remains editable, but its font was not silently substituted.`);
			} else {
				warnings.push(`Could not load a bundled font for “${text}”. This text remains editable and the browser's font fallback will be used.`);
			}
		}
	});
	return { outlines, warnings };
}
