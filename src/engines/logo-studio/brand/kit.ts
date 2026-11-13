import { validateLogoProject } from '../export/project-file';
import type { LogoProject } from '../model/types';
import { sanitizeReferenceSvg } from '../store/references';
import { getCustomFont, saveCustomFont } from '../store/custom-fonts';
import { inspectCustomFont } from '../library/custom-fonts';

export interface BrandKit {
	starmore_brand_kit: 1;
	id: string;
	name: string;
	createdAt: number;
	updatedAt: number;
	colors: { name: string; hex: string }[];
	fonts: { heading: string; subheading: string; body: string };
	logo?: LogoProject;
	customFonts?: { family: string; filename: string; mime: string; dataUri: string }[];
}

export interface ExportKitResult {
	blob: Blob;
	warnings: string[];
}

const MAX_KIT_BYTES = 10 * 1024 * 1024;
const MAX_COLORS = 20;
const MAX_CUSTOM_FONTS = 30;
const FONT_MIME_TYPES = new Set([
	'font/ttf',
	'font/otf',
	'font/woff',
	'application/x-font-ttf',
	'application/x-font-opentype',
	'application/font-woff',
	'application/x-font-woff',
]);

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertKeys(record: JsonRecord, allowed: string[], label: string): void {
	const unexpected = Object.keys(record).find((key) => !allowed.includes(key));
	if (unexpected) throw new Error(`The brand kit contains an unexpected “${unexpected}” ${label}.`);
}

function requiredText(value: unknown, label: string, maximum: number): string {
	if (typeof value !== 'string' || !value.trim() || value.length > maximum) {
		throw new Error(`The brand kit has an invalid ${label}.`);
	}
	return value.trim();
}

function decodeSvgDataUri(value: string): string | null {
	const match = /^data:image\/svg\+xml(?:;[^,]*)?,(.*)$/is.exec(value);
	if (!match) return null;
	const metadata = value.slice(0, value.indexOf(',')).toLowerCase();
	if (metadata.includes(';base64')) {
		const binary = atob(match[1]);
		const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
		return new TextDecoder().decode(bytes);
	}
	try {
		return decodeURIComponent(match[1]);
	} catch {
		throw new Error('The brand kit contains a malformed embedded SVG image.');
	}
}

function sanitizeProjectSvgImages(project: LogoProject): LogoProject {
	const copy = structuredClone(project);
	const visit = (elements: import('../model/types').Element[]) => {
		for (const element of elements) {
			if (element.type === 'image' && element.src) {
				const source = decodeSvgDataUri(element.src);
				if (source !== null) {
					const clean = sanitizeReferenceSvg(source);
					element.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(clean)}`;
				}
			}
			if (element.children) visit(element.children);
		}
	};
	Object.values(copy.variants).forEach(visit);
	return copy;
}

function validateCustomFonts(value: unknown): BrandKit['customFonts'] {
	if (value === undefined) return undefined;
	if (!Array.isArray(value) || value.length > MAX_CUSTOM_FONTS) {
		throw new Error(`A brand kit can include at most ${MAX_CUSTOM_FONTS} custom fonts.`);
	}
	return value.map((font) => {
		if (!isRecord(font)) throw new Error('The brand kit contains an invalid custom font.');
		assertKeys(font, ['family', 'filename', 'mime', 'dataUri'], 'custom font field');
		const family = requiredText(font.family, 'custom font family', 100);
		const filename = requiredText(font.filename, 'custom font filename', 180);
		if (typeof font.mime !== 'string' || !FONT_MIME_TYPES.has(font.mime)) {
			throw new Error(`The custom font “${family}” has an unsupported MIME type.`);
		}
		if (typeof font.dataUri !== 'string' || font.dataUri.length > Math.ceil(MAX_KIT_BYTES * 4 / 3) + 128) {
			throw new Error(`The custom font “${family}” has invalid or oversized data.`);
		}
		const match = /^data:([^;,]+);base64,([\da-z+/]+=*)$/i.exec(font.dataUri);
		if (!match || match[1].toLowerCase() !== font.mime.toLowerCase()) {
			throw new Error(`The custom font “${family}” has invalid embedded data.`);
		}
		return { family, filename, mime: font.mime, dataUri: font.dataUri };
	});
}

export function validateBrandKit(value: unknown): BrandKit {
	if (!isRecord(value)) throw new Error('This file is not a Starmore brand kit.');
	if (typeof value.starmore_brand_kit === 'number' && value.starmore_brand_kit > 1) {
		throw new Error('This brand kit was created with a newer version. Update the app to import it.');
	}
	if (value.starmore_brand_kit !== 1) throw new Error('This brand kit version is not supported.');
	assertKeys(value, ['starmore_brand_kit', 'id', 'name', 'createdAt', 'updatedAt', 'colors', 'fonts', 'logo', 'customFonts'], 'field');
	if (typeof value.createdAt !== 'number' || !Number.isFinite(value.createdAt)
		|| typeof value.updatedAt !== 'number' || !Number.isFinite(value.updatedAt)) {
		throw new Error('The brand kit has invalid timestamps.');
	}
	if (!Array.isArray(value.colors) || value.colors.length > MAX_COLORS) {
		throw new Error(`A brand kit can contain at most ${MAX_COLORS} colours.`);
	}
	const colors = value.colors.map((color) => {
		if (!isRecord(color)) throw new Error('The brand kit contains an invalid colour.');
		assertKeys(color, ['name', 'hex'], 'colour property');
		const name = requiredText(color.name, 'colour name', 60);
		if (typeof color.hex !== 'string' || !/^#[\da-f]{6}$/i.test(color.hex)) {
			throw new Error(`The brand colour “${name}” must use a six-digit HEX value.`);
		}
		return { name, hex: color.hex.toUpperCase() };
	});
	if (!isRecord(value.fonts)) throw new Error('The brand kit is missing its font families.');
	assertKeys(value.fonts, ['heading', 'subheading', 'body'], 'font field');
	const fonts = {
		heading: requiredText(value.fonts.heading, 'heading font', 100),
		subheading: requiredText(value.fonts.subheading, 'subheading font', 100),
		body: requiredText(value.fonts.body, 'body font', 100),
	};
	let logo: LogoProject | undefined;
	if (value.logo !== undefined) {
		logo = sanitizeProjectSvgImages(validateLogoProject(value.logo));
	}
	return {
		starmore_brand_kit: 1,
		id: requiredText(value.id, 'identifier', 160),
		name: requiredText(value.name, 'name', 120),
		createdAt: value.createdAt,
		updatedAt: value.updatedAt,
		colors,
		fonts,
		...(logo ? { logo } : {}),
		...(value.customFonts === undefined ? {} : { customFonts: validateCustomFonts(value.customFonts) }),
	};
}

export function exportKit(kit: BrandKit, options: { includeFonts?: boolean } = {}): ExportKitResult {
	const validated = validateBrandKit(kit);
	const includeFonts = options.includeFonts ?? false;
	const exported: BrandKit = {
		...validated,
		...(includeFonts && validated.customFonts?.length ? {} : { customFonts: undefined }),
	};
	if (!includeFonts) delete exported.customFonts;
	const serialized = `${JSON.stringify(exported, null, 2)}\n`;
	if (new Blob([serialized]).size > MAX_KIT_BYTES) throw new Error('The exported brand kit exceeds the 10 MB size limit.');
	return {
		blob: new Blob([serialized], { type: 'application/json' }),
		warnings: includeFonts && validated.customFonts?.length
			? ['Including custom fonts redistributes font files. Only share fonts you have the right to redistribute.']
			: [],
	};
}

export async function importKit(file: File): Promise<BrandKit> {
	if (file.size > MAX_KIT_BYTES) throw new Error('Brand kit files must be 10 MB or smaller.');
	if (file.type !== 'application/json' && !file.name.toLowerCase().endsWith('.json')) {
		throw new Error('Choose a Starmore brand kit in JSON format.');
	}
	let parsed: unknown;
	try {
		parsed = JSON.parse(await file.text());
	} catch {
		throw new Error('This brand kit is not valid JSON.');
	}
	const kit = validateBrandKit(parsed);
	await validateKitFonts(kit);
	return kit;
}

async function decodeKitFont(font: NonNullable<BrandKit['customFonts']>[number]): Promise<Blob> {
	const [, encoded] = font.dataUri.split(',', 2);
	let binary: string;
	try {
		binary = atob(encoded);
	} catch {
		throw new Error(`The custom font “${font.family}” has invalid embedded data.`);
	}
	if (binary.length > MAX_KIT_BYTES) throw new Error(`The custom font “${font.family}” exceeds the 10 MB limit.`);
	return new Blob([Uint8Array.from(binary, (character) => character.charCodeAt(0))], { type: font.mime });
}

async function validateKitFonts(kit: BrandKit): Promise<void> {
	for (const font of kit.customFonts ?? []) {
		const inspected = await inspectCustomFont(await decodeKitFont(font), font.filename);
		if (inspected.family.toLocaleLowerCase() !== font.family.toLocaleLowerCase() || inspected.mime !== font.mime) {
			throw new Error(`The embedded data does not match the “${font.family}” custom font.`);
		}
	}
}

export async function restoreBrandKitFonts(kit: BrandKit): Promise<void> {
	const restored = await Promise.all((kit.customFonts ?? []).map(async (font) => {
		const inspected = await inspectCustomFont(await decodeKitFont(font), font.filename);
		if (inspected.family.toLocaleLowerCase() !== font.family.toLocaleLowerCase() || inspected.mime !== font.mime) {
			throw new Error(`The embedded data does not match the “${font.family}” custom font.`);
		}
		return inspected;
	}));
	await Promise.all(restored.map(saveCustomFont));
}

async function blobToDataUri(blob: Blob): Promise<string> {
	const bytes = new Uint8Array(await blob.arrayBuffer());
	let binary = '';
	for (let index = 0; index < bytes.length; index += 0x8000) {
		binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
	}
	return `data:${blob.type};base64,${btoa(binary)}`;
}

export async function createBrandKitFromProject(project: LogoProject, name = project.name): Promise<BrandKit> {
	const colors = new Map<string, { name: string; hex: string }>();
	const fonts: string[] = [];
	let heading: string | undefined;
	let subheading: string | undefined;
	const addColor = (value: string | undefined) => {
		if (!value || !/^#[\da-f]{6}$/i.test(value)) return;
		const hex = value.toUpperCase();
		if (!colors.has(hex) && colors.size < MAX_COLORS) colors.set(hex, { name: `Brand colour ${colors.size + 1}`, hex });
	};
	const visit = (elements: import('../model/types').Element[]) => {
		for (const element of elements) {
			addColor(element.fill);
			addColor(element.stroke);
			addColor(element.shadow?.color);
			element.gradient?.stops.forEach((stop) => addColor(stop.color));
			if (element.type === 'text' && element.fontFamily && !fonts.includes(element.fontFamily)) fonts.push(element.fontFamily);
			if (element.type === 'text' && element.role === 'name' && !heading) heading = element.fontFamily;
			if (element.type === 'text' && element.role === 'tagline' && !subheading) subheading = element.fontFamily;
			if (element.children) visit(element.children);
		}
	};
	addColor(project.artboard.background);
	Object.values(project.variants).forEach(visit);
	const now = Date.now();
	const metadata = new Map((project.customFonts ?? []).map((font) => [font.family.toLocaleLowerCase(), font]));
	const customFonts: NonNullable<BrandKit['customFonts']> = [];
	for (const family of new Set([...metadata.keys(), ...fonts.map((font) => font.toLocaleLowerCase())])) {
		const fontMetadata = metadata.get(family);
		const stored = await getCustomFont(fontMetadata?.family ?? family);
		if (!stored && fontMetadata) throw new Error(`Missing font: “${fontMetadata.family}”. Re-upload it before creating a brand kit.`);
		if (!stored) continue;
		const customFont = {
			family: stored.family,
			filename: stored.filename,
			mime: stored.mime,
			dataUri: await blobToDataUri(stored.blob),
		};
		customFonts.push(customFont);
		metadata.set(family, { family: stored.family, filename: stored.filename, mime: stored.mime });
	}
	const kitProject = { ...project, ...(metadata.size ? { customFonts: [...metadata.values()] } : {}) };
	return validateBrandKit({
		starmore_brand_kit: 1,
		id: globalThis.crypto?.randomUUID?.() ?? `brand-${now}-${Math.random().toString(36).slice(2)}`,
		name: name.trim() || 'Brand kit',
		createdAt: now,
		updatedAt: now,
		colors: [...colors.values()],
		fonts: {
			heading: heading ?? fonts[0] ?? 'Inter',
			subheading: subheading ?? fonts[1] ?? heading ?? fonts[0] ?? 'Inter',
			body: fonts.at(-1) ?? 'Inter',
		},
		logo: kitProject,
		...(customFonts.length ? { customFonts } : {}),
	});
}

export const BRAND_KIT_MAX_BYTES = MAX_KIT_BYTES;
export const BRAND_KIT_FONT_MIME_TYPES = [...FONT_MIME_TYPES];
