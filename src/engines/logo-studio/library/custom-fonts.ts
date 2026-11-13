import opentype from 'opentype.js';
import { getCustomFont, saveCustomFont, type StoredCustomFont } from '../store/custom-fonts';

export const CUSTOM_FONT_MAX_BYTES = 10 * 1024 * 1024;
export const WOFF2_MESSAGE = "WOFF2 isn't supported for logo export. Please upload the TTF, OTF or WOFF version.";
const customFontLoadPromises = new Map<string, Promise<void>>();

function detectFormat(bytes: Uint8Array): { format: 'ttf' | 'otf' | 'woff'; mime: string } {
	const signature = String.fromCharCode(...bytes.subarray(0, 4));
	if (signature === 'wOF2') throw new Error(WOFF2_MESSAGE);
	if (signature === 'wOFF') return { format: 'woff', mime: 'font/woff' };
	if (signature === 'OTTO') return { format: 'otf', mime: 'font/otf' };
	if (signature === '\u0000\u0001\u0000\u0000' || signature === 'true') return { format: 'ttf', mime: 'font/ttf' };
	throw new Error('The font file signature is not a supported TTF, OTF or WOFF font.');
}

function familyName(font: opentype.Font, filename: string): string {
	const family = font.names.fontFamily?.en?.trim();
	if (family && family.length <= 100 && !/[\u0000-\u001f]/.test(family)) return family;
	const fallback = filename.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim();
	if (!fallback || fallback.length > 100) throw new Error('The font does not contain a usable family name.');
	return fallback;
}

export async function inspectCustomFont(blob: Blob, filename: string): Promise<StoredCustomFont> {
	if (blob.size > CUSTOM_FONT_MAX_BYTES) throw new Error('Font files must be 10 MB or smaller.');
	const buffer = await blob.arrayBuffer();
	const bytes = new Uint8Array(buffer);
	const { format, mime } = detectFormat(bytes);
	const extension = filename.split('.').pop()?.toLowerCase();
	if (extension === 'woff2') throw new Error(WOFF2_MESSAGE);
	if (extension && extension !== format) {
		throw new Error(`The font file extension does not match its ${format.toUpperCase()} file signature.`);
	}
	let parsed: opentype.Font;
	try {
		parsed = opentype.parse(buffer);
	} catch {
		throw new Error('The font could not be parsed. Choose a valid TTF, OTF or WOFF font file.');
	}
	const family = familyName(parsed, filename);
	try {
		const face = new FontFace(family, buffer, { weight: '400' });
		await face.load();
		document.fonts.add(face);
	} catch {
		throw new Error('The font could not be loaded by this browser.');
	}
	return { family, filename: filename.slice(0, 180), mime, blob: new Blob([buffer], { type: mime }) };
}

export async function importCustomFont(blob: Blob, filename: string): Promise<StoredCustomFont> {
	const font = await inspectCustomFont(blob, filename);
	await saveCustomFont(font);
	return font;
}

export async function loadStoredCustomFont(family: string, weight: number): Promise<void> {
	const key = `${family.toLocaleLowerCase()}:${weight >= 600 ? 700 : 400}`;
	const cached = customFontLoadPromises.get(key);
	if (cached) return cached;
	const loading = loadStoredCustomFontUncached(family, weight);
	customFontLoadPromises.set(key, loading);
	loading.catch(() => customFontLoadPromises.delete(key));
	return loading;
}

async function loadStoredCustomFontUncached(family: string, weight: number): Promise<void> {
	const stored = await getCustomFont(family);
	if (!stored) throw new Error(`Missing font: “${family}”. Upload it again to use or export this logo.`);
	const face = new FontFace(stored.family, await stored.blob.arrayBuffer(), { weight: String(weight >= 600 ? 700 : 400) });
	await face.load();
	document.fonts.add(face);
}
