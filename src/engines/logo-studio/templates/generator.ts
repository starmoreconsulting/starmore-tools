import { logoPalettes, type LogoPalette } from '../library/palettes';
import type { Element, LogoBrief } from '../model/types';
import { styleRules, industryRules } from './rules';
import { logoLayouts, type FontPair } from './layouts';

export interface LogoDesign {
	id: string;
	name: string;
	layoutId: string;
	palette: LogoPalette;
	fontPair: FontPair;
	icon: string;
	weight: number;
	letterSpacing: number;
	score: number;
	elements: Element[];
}

export interface DesignFilters {
	industry?: LogoBrief['industry'];
	style?: LogoBrief['style'];
	layout?: string;
}

const PAGE_SIZE = 24;

function hashSeed(value: string): number {
	let hash = 2166136261;
	for (const character of value) {
		hash ^= character.codePointAt(0) ?? 0;
		hash = Math.imul(hash, 16777619);
	}
	return hash >>> 0;
}

function randomGenerator(seed: number): () => number {
	let state = seed >>> 0;
	return () => {
		state += 0x6d2b79f5;
		let value = state;
		value = Math.imul(value ^ (value >>> 15), value | 1);
		value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
		return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
	};
}

function paletteByName(name: string): LogoPalette | undefined {
	return logoPalettes.find((palette) => palette.name === name);
}

function makeCustomPalette(color: string): LogoPalette {
	return { name: 'Custom', colors: [color, '#ffffff', '#737373', '#111111'] };
}

function unique<T>(items: T[], key: (item: T) => string): T[] {
	const seen = new Set<string>();
	return items.filter((item) => {
		const id = key(item);
		if (seen.has(id)) return false;
		seen.add(id);
		return true;
	});
}

function applyTypography(elements: Element[], weight: number, letterSpacing: number, businessName: string): Element[] {
	return elements.map((element) => {
		if (element.type === 'text' && (element.name === 'Business name' || element.text === businessName)) {
			return { ...element, fontWeight: weight, letterSpacing };
		}
		if (element.children) return { ...element, children: applyTypography(element.children, weight, letterSpacing, businessName) };
		return element;
	});
}

function getCandidates(brief: LogoBrief, seed: number, filters: DesignFilters = {}): LogoDesign[] {
	const industry = filters.industry ?? brief.industry;
	const style = filters.style ?? brief.style;
	const rules = styleRules[style];
	const layouts = logoLayouts.filter((layout) =>
		rules.layouts.includes(layout.id)
		&& layout.arrangements.includes(brief.arrangement)
		&& (!filters.layout || layout.id === filters.layout));
	const palettes = unique(
		[
			...(brief.preferredPalette === 'Custom' && brief.customColor ? [makeCustomPalette(brief.customColor)] : []),
			...rules.palettes.map(paletteByName).filter((palette): palette is LogoPalette => Boolean(palette)),
		],
		(palette) => palette.name,
	);
	const fontPairs = unique(rules.fontPairs, (pair) => `${pair.primary}:${pair.secondary}`);
	const icons = industryRules[industry].icons;
	const random = randomGenerator(seed);
	const candidates: LogoDesign[] = [];

	for (const layout of layouts) {
		for (const palette of palettes) {
			for (const fontPair of fontPairs) {
				for (const icon of layout.id === 'text-only' || layout.id === 'underline-wordmark' || layout.id === 'two-line-wordmark' ? ['none'] : icons) {
					for (const weight of rules.weights) {
						const letterSpacing = rules.letterSpacing[Math.floor(random() * rules.letterSpacing.length)];
						const preferredPalette = palette.name === brief.preferredPalette;
						const preferredArrangement = layout.arrangements.includes(brief.arrangement);
						const styleScore = (rules.layouts.includes(layout.id) ? 100 : 0)
							+ (rules.palettes.includes(palette.name) ? 25 : 0)
							+ (rules.fontPairs.some((pair) => pair.name === fontPair.name) ? 25 : 0)
							+ (preferredArrangement ? 10 : 0)
							+ (preferredPalette ? 8 : 0);
						const elements = layout.build({ brief, palette, fontPair, icon });
						const styledElements = applyTypography(elements, weight, letterSpacing, brief.businessName);
						candidates.push({
							id: `${hashSeed(JSON.stringify(brief)).toString(36)}|${layout.id}|${palette.name}|${fontPair.name}|${icon}|${weight}|${letterSpacing}`,
							name: layout.name,
							layoutId: layout.id,
							palette,
							fontPair,
							icon,
							weight,
							letterSpacing,
							score: styleScore * 1000 + Math.floor(random() * 1000),
							elements: styledElements,
						});
					}
				}
			}
		}
	}

	return unique(candidates.sort((left, right) => right.score - left.score || left.id.localeCompare(right.id)), (candidate) => candidate.id);
}

export function seedForBrief(brief: LogoBrief): number {
	return hashSeed(JSON.stringify(brief));
}

export function generateLogoDesigns(
	brief: LogoBrief,
	options: { seed?: number; page?: number; filters?: DesignFilters } = {},
): { designs: LogoDesign[]; hasMore: boolean; total: number } {
	const seed = options.seed ?? seedForBrief(brief);
	const page = Math.max(0, Math.floor(options.page ?? 0));
	const candidates = getCandidates(brief, seed, options.filters);
	const start = page * PAGE_SIZE;
	return {
		designs: candidates.slice(start, start + PAGE_SIZE),
		hasMore: start + PAGE_SIZE < candidates.length,
		total: candidates.length,
	};
}

export const LOGO_DESIGNS_PER_PAGE = PAGE_SIZE;
