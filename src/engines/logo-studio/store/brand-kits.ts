import { del, get, set } from 'idb-keyval';
import { validateBrandKit, type BrandKit } from '../brand/kit';

const INDEX_KEY = 'logo-studio:brand-kit-index:v1';
const ACTIVE_KEY = 'logo-studio:active-brand-kit:v1';
const KIT_PREFIX = 'logo-studio:brand-kit:v1:';

function kitKey(id: string): string {
	return `${KIT_PREFIX}${id}`;
}

function kitIds(value: unknown): string[] {
	if (!Array.isArray(value) || !value.every((id) => typeof id === 'string')) return [];
	return value;
}

export async function listBrandKits(): Promise<BrandKit[]> {
	const ids = kitIds(await get<unknown>(INDEX_KEY));
	const stored = await Promise.all(ids.map((id) => get<unknown>(kitKey(id))));
	return stored.filter((value) => value !== undefined).map(validateBrandKit);
}

export async function saveBrandKit(kit: BrandKit): Promise<void> {
	const validated = validateBrandKit(kit);
	const ids = kitIds(await get<unknown>(INDEX_KEY));
	await set(kitKey(validated.id), validated);
	await set(INDEX_KEY, [validated.id, ...ids.filter((id) => id !== validated.id)]);
}

export async function renameBrandKit(id: string, name: string): Promise<void> {
	const clean = name.trim();
	if (!clean || clean.length > 120) throw new Error('Brand kit names must be between 1 and 120 characters.');
	const kit = validateBrandKit(await get<unknown>(kitKey(id)));
	await saveBrandKit({ ...kit, name: clean, updatedAt: Date.now() });
}

export async function deleteBrandKit(id: string): Promise<void> {
	await del(kitKey(id));
	const ids = kitIds(await get<unknown>(INDEX_KEY)).filter((entry) => entry !== id);
	if (ids.length) await set(INDEX_KEY, ids);
	else await del(INDEX_KEY);
	if (await get<unknown>(ACTIVE_KEY) === id) await del(ACTIVE_KEY);
}

export async function setActiveBrandKitId(id: string | null): Promise<void> {
	if (id === null) {
		await del(ACTIVE_KEY);
		return;
	}
	const kit = await get<unknown>(kitKey(id));
	if (kit === undefined) throw new Error('The selected brand kit could not be found.');
	validateBrandKit(kit);
	await set(ACTIVE_KEY, id);
}

export async function getActiveBrandKit(): Promise<BrandKit | null> {
	const id = await get<unknown>(ACTIVE_KEY);
	if (typeof id !== 'string') return null;
	const kit = await get<unknown>(kitKey(id));
	if (kit === undefined) return null;
	return validateBrandKit(kit);
}
