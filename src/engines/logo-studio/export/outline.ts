import opentype from 'opentype.js';
import type { Element, LogoProject } from '../model/types';
import { getLogoFont, logoFonts } from '../library/fonts';
import { getCustomFont } from '../store/custom-fonts';

export interface TextOutline {
	elementId: string;
	markup: string;
	paths: { d: string; transform: string }[];
	unsupportedChars: string[];
}

export interface TextGlyphPlacement {
	glyph: opentype.Glyph;
	font: opentype.Font;
	character: string;
	centerX: number;
	centerY: number;
	rotation: number;
	advance: number;
}

export interface OutlineResult {
	outlines: Map<string, TextOutline>;
	warnings: string[];
	unsupportedChars: string[];
	elementsAffected: string[];
}

function finiteOr(value: number | undefined, fallback: number): number {
	return value !== undefined && Number.isFinite(value) ? value : fallback;
}

const parsedFonts = new Map<string, Promise<opentype.Font>>();

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
	try {
		return Array.from(text.normalize('NFC')).every((character) => {
			const codePoint = character.codePointAt(0) ?? 0;
			if (/\s/.test(character) || codePoint === 0x200d || (codePoint >= 0xfe00 && codePoint <= 0xfe0f)) return true;
			return font.charToGlyph(character).index !== 0;
		});
	} catch {
		return false;
	}
}

export async function findUnbundledCharacters(project: LogoProject): Promise<string[]> {
	const characters = new Set<string>();
	const collect = (elements: Element[]) => elements.forEach((element) => {
		if (element.type === 'text') {
			for (const character of Array.from((element.text ?? '').normalize('NFC'))) {
				const codePoint = character.codePointAt(0) ?? 0;
				if (!/\s/.test(character) && codePoint !== 0x200d && !(codePoint >= 0xfe00 && codePoint <= 0xfe0f)) {
					characters.add(character);
				}
			}
		}
		if (element.children) collect(element.children);
	});
	collect(Object.values(project.variants).flat());
	if (!characters.size) return [];

	const fonts = await Promise.allSettled(logoFonts.map(({ family }) => getOpenTypeFont(family, 400)));
	const loadedFonts = fonts.flatMap((result) => result.status === 'fulfilled' ? [result.value] : []);
	return [...characters].filter((character) => !loadedFonts.some(({ font }) => fontContainsText(font, character)));
}

interface FontRun {
	character: string;
	font: opentype.Font | null;
	family: string;
}

async function getFontsForText(family: string, weight: number, text: string): Promise<FontRun[]> {
	const candidates = [family, ...logoFonts.map(({ family: bundled }) => bundled).filter((bundled) => bundled !== family)];
	const loaded: { font: opentype.Font; family: string }[] = [];
	for (const candidate of candidates) {
		try {
			loaded.push(await getOpenTypeFont(candidate, weight).then((font) => ({ font, family: candidate })));
		} catch {
			continue;
		}
		if (fontContainsText(loaded[loaded.length - 1].font, text)) {
			return Array.from(text.normalize('NFC'), (character) => ({
				character,
				font: loaded[loaded.length - 1].font,
				family: loaded[loaded.length - 1].family,
			}));
		}
	}

	const primary = loaded[0];
	return Array.from(text.normalize('NFC'), (character) => {
		const codePoint = character.codePointAt(0) ?? 0;
		if (/\s/.test(character) || codePoint === 0x200d || (codePoint >= 0xfe00 && codePoint <= 0xfe0f)) {
			return { character, font: primary?.font ?? null, family: primary?.family ?? family };
		}
		const match = loaded.find(({ font }) => fontContainsText(font, character));
		return { character, font: match?.font ?? primary?.font ?? null, family: match?.family ?? primary?.family ?? family };
	});
}

export function layoutTextGlyphs(element: Element, font: opentype.Font): TextGlyphPlacement[] {
	return layoutTextGlyphRuns(element, Array.from(element.text ?? '', (character) => ({ character, font, family: '' })));
}

function layoutTextGlyphRuns(element: Element, runs: FontRun[]): TextGlyphPlacement[] {
	const fontSize = Math.max(1, finiteOr(element.fontSize, 48));
	const width = finiteOr(element.width, 0);
	const height = finiteOr(element.height, 0);
	const lines: FontRun[][] = [[]];
	for (const run of runs) {
		if (run.character === '\n') lines.push([]);
		else lines[lines.length - 1].push(run);
	}
	const lineHeight = Math.max(0, finiteOr(element.lineHeight, 1.16)) * fontSize;
	const firstFont = runs.find((run) => run.font)?.font;
	if (!firstFont) return [];
	const scale = (font: opentype.Font) => fontSize / font.unitsPerEm;
	const baselineOffset = ((firstFont.ascender + firstFont.descender) / 2) * scale(firstFont);
	const firstBaseline = height / 2 + baselineOffset - ((lines.length - 1) * lineHeight) / 2;
	const letterSpacing = finiteOr(element.letterSpacing, 0);
	const curve = Math.min(100, Math.max(-100, finiteOr(element.curve, 0))) / 100;
	const placements: TextGlyphPlacement[] = [];

	lines.forEach((line, lineIndex) => {
		const glyphs = line.map(({ character, font }) => font ? { glyph: font.charToGlyph(character), font } : null);
		const advances = glyphs.map((placement, index) => {
			if (!placement) return Math.max(fontSize * 0.5, 1);
			const next = glyphs[index + 1];
			const kern = next?.font === placement.font ? placement.font.getKerningValue(placement.glyph, next.glyph) : 0;
			return (placement.glyph.advanceWidth ?? placement.font.unitsPerEm) * scale(placement.font)
				+ (next ? kern * scale(placement.font) + letterSpacing : 0);
		});
		const lineWidth = advances.reduce((total, advance) => total + advance, 0);
		const startX = element.align === 'left' ? 0
			: element.align === 'right' ? width - lineWidth
				: (width - lineWidth) / 2;
		const baseline = firstBaseline + lineIndex * lineHeight;
		const totalAngle = Math.abs(curve) * Math.PI;
		const radius = totalAngle > 0.0001 ? Math.max(1, lineWidth / totalAngle) : 0;
		let cursor = startX;

		glyphs.forEach((placement, index) => {
			if (!placement) {
				cursor += advances[index];
				return;
			}
			const next = glyphs[index + 1];
			const kern = next?.font === placement.font ? placement.font.getKerningValue(placement.glyph, next.glyph) : 0;
			const advance = advances[index] - (next ? kern * scale(placement.font) + letterSpacing : 0);
			const centerInLine = cursor - startX + advance / 2;
			if (radius === 0) {
				placements.push({ glyph: placement.glyph, font: placement.font, character: line[index].character, centerX: cursor + advance / 2, centerY: baseline, rotation: 0, advance });
			} else {
				const theta = (centerInLine - lineWidth / 2) / radius;
				const sign = Math.sign(curve);
				placements.push({
					glyph: placement.glyph,
					font: placement.font,
					character: line[index].character,
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

async function outlineText(element: Element, shouldOutline: boolean): Promise<{ outline: TextOutline; warning?: string; unsupportedChars: string[] }> {
	const preferredFamily = element.fontFamily ?? 'Inter';
	const text = element.text ?? '';
	if (!text) {
		return { outline: { elementId: element.id, markup: '', paths: [], unsupportedChars: [] }, unsupportedChars: [] };
	}
	const runs = await getFontsForText(preferredFamily, element.fontWeight ?? 400, text);
	const unsupportedChars = [...new Set(runs.filter(({ font, character }) => {
		const codePoint = character.codePointAt(0) ?? 0;
		return Boolean(font && !/\s/.test(character) && codePoint !== 0x200d
			&& !(codePoint >= 0xfe00 && codePoint <= 0xfe0f) && font.charToGlyph(character).index === 0)
			|| !font && !/\s/.test(character) && codePoint !== 0x200d
				&& !(codePoint >= 0xfe00 && codePoint <= 0xfe0f);
	}).map(({ character }) => character))];
	const placements = shouldOutline ? layoutTextGlyphRuns(element, runs) : [];
	const fontSize = Math.max(1, finiteOr(element.fontSize, 48));
	const paths = placements.map(({ glyph, font, character, centerX, centerY, rotation, advance }) => {
		if (character && unsupportedChars.includes(character)) return null;
		if (!Number.isFinite(font.unitsPerEm) || font.unitsPerEm <= 0) return null;
		const scale = fontSize / font.unitsPerEm;
		if (![centerX, centerY, rotation, advance].every(Number.isFinite)) {
			return null;
		}
		const d = glyph.getPath(0, 0, font.unitsPerEm).toPathData(3);
		if (/(?:NaN|Infinity)/i.test(d)) {
			return null;
		}
		const transform = `translate(${centerX} ${centerY}) rotate(${rotation}) translate(${-advance / 2} 0) scale(${scale})`;
		return { d, transform };
	}).filter((path): path is { d: string; transform: string } => path !== null);
	const fallbackFamilies = [...new Set(runs.map((run) => run.family))];
	return {
		outline: {
			elementId: element.id,
			markup: paths.map((path) => `<path d="${path.d}" transform="${path.transform}"/>`).join(''),
			paths,
			unsupportedChars,
		},
		unsupportedChars,
		...(unsupportedChars.length ? {
			warning: `No bundled font contains ${unsupportedChars.map((character) => `“${escapeWarningText(character)}”`).join(', ')} in “${escapeWarningText(text)}”.`,
		} : fallbackFamilies.some((family) => family !== preferredFamily) ? {
			warning: `The “${escapeWarningText(preferredFamily)}” font does not include every character in “${escapeWarningText(text)}”. Bundled fallback fonts were used.`,
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
	const unsupportedChars = new Set<string>();
	const elementsAffected = new Set<string>();
	const elements = Object.values(project.variants).flat();
	await visitElements(elements, async (element) => {
		try {
			const shouldOutline = !curvedOnly || Boolean(element.curve);
			const result = await outlineText(element, shouldOutline);
			if (shouldOutline) outlines.set(element.id, result.outline);
			result.unsupportedChars.forEach((character) => unsupportedChars.add(character));
			if (result.unsupportedChars.length) elementsAffected.add(element.id);
			if (result.warning) warnings.push(result.warning);
		} catch {
			const text = Array.from((element.text ?? '').normalize('NFC')).filter((character) => (
				!/\s/.test(character) && character !== '\u200d' && !/[\uFE00-\uFE0F]/u.test(character)
			));
			text.forEach((character) => unsupportedChars.add(character));
			if (text.length) {
				elementsAffected.add(element.id);
				warnings.push(`Could not outline “${escapeWarningText(element.text ?? 'text')}”. Unsupported characters remain live text.`);
			}
		}
	});
	return { outlines, warnings, unsupportedChars: [...unsupportedChars], elementsAffected: [...elementsAffected] };
}
