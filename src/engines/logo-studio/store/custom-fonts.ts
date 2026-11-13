import { del, get, keys, set } from 'idb-keyval';

export interface StoredCustomFont {
	family: string;
	filename: string;
	mime: string;
	blob: Blob;
}

const PREFIX = 'logo-studio:custom-font:v1:';

function keyFor(family: string): string {
	return `${PREFIX}${family.trim().toLocaleLowerCase()}`;
}

export async function getCustomFont(family: string): Promise<StoredCustomFont | undefined> {
	return get<StoredCustomFont>(keyFor(family));
}

export async function saveCustomFont(font: StoredCustomFont): Promise<void> {
	await set(keyFor(font.family), font);
}

export async function removeCustomFont(family: string): Promise<void> {
	await del(keyFor(family));
}

export async function listCustomFonts(): Promise<StoredCustomFont[]> {
	const fontKeys = (await keys()).filter((key): key is string => typeof key === 'string' && key.startsWith(PREFIX));
	const stored = await Promise.all(fontKeys.map((key) => get<StoredCustomFont>(key)));
	return stored.filter((font): font is StoredCustomFont => font !== undefined);
}
