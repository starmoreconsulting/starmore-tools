import opentype from 'opentype.js';
import type { Element, LogoProject } from '../model/types';
import { getLogoFont } from '../library/fonts';

export interface TextOutline {
	elementId: string;
	pathData: string;
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

function linePath(
	font: opentype.Font,
	text: string,
	fontSize: number,
	letterSpacing: number,
	startX: number,
	baseline: number,
): { pathData: string; width: number } {
	const glyphs = font.stringToGlyphs(text);
	const scale = fontSize / font.unitsPerEm;
	let x = startX;
	let pathData = '';

	for (let index = 0; index < glyphs.length; index += 1) {
		const glyph = glyphs[index];
		const nextGlyph = glyphs[index + 1];
		pathData += glyph.getPath(x, baseline, fontSize).toPathData(3);
		x += (glyph.advanceWidth ?? font.unitsPerEm) * scale;
		if (nextGlyph) {
			x += font.getKerningValue(glyph, nextGlyph) * scale + letterSpacing;
		}
	}

	return { pathData, width: x - startX };
}

async function outlineText(element: Element): Promise<TextOutline> {
	const fontSize = Math.max(1, element.fontSize ?? 48);
	const font = await getOpenTypeFont(element.fontFamily ?? 'Inter', element.fontWeight ?? 400);
	const lines = (element.text ?? '').split('\n');
	const lineHeight = Math.max(0, element.lineHeight ?? 1.16) * fontSize;
	const scale = fontSize / font.unitsPerEm;
	const baselineOffset = ((font.ascender + font.descender) / 2) * scale;
	const firstBaseline = element.height / 2 + baselineOffset - ((lines.length - 1) * lineHeight) / 2;
	const paths = lines.map((line, index) => {
		const measured = linePath(font, line, fontSize, element.letterSpacing ?? 0, 0, firstBaseline + index * lineHeight);
		const startX = element.align === 'left'
			? 0
			: element.align === 'right'
				? element.width - measured.width
				: (element.width - measured.width) / 2;
		return linePath(font, line, fontSize, element.letterSpacing ?? 0, startX, firstBaseline + index * lineHeight).pathData;
	}).join('');

	return { elementId: element.id, pathData: paths };
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
