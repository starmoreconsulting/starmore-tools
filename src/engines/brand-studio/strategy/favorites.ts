import { get, set } from 'idb-keyval';

const FAVORITES_KEY = 'brand-studio:name-favorites:v1';

export async function listFavoriteNames(): Promise<string[]> {
	const stored = await get<unknown>(FAVORITES_KEY);
	return Array.isArray(stored) && stored.every((value) => typeof value === 'string') ? stored : [];
}

export async function toggleFavoriteName(name: string): Promise<string[]> {
	const current = await listFavoriteNames();
	const normalized = name.trim();
	if (!normalized) throw new Error('Choose a name before adding a favorite.');
	const next = current.includes(normalized)
		? current.filter((entry) => entry !== normalized)
		: [normalized, ...current].slice(0, 500);
	await set(FAVORITES_KEY, next);
	return next;
}
