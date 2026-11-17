import { del, get, set } from 'idb-keyval';
import type { Element, LogoProject } from '../model/types';

const PREFIX = 'logo-studio:moodboard-image:v1:';

export interface StoredMoodBoardImage {
	elementId: string;
	name: string;
	blob: Blob;
	dataUrl: string;
}

function storageKey(projectId: string, elementId: string): string {
	return `${PREFIX}${projectId}:${elementId}`;
}

export async function saveMoodBoardImage(projectId: string, image: StoredMoodBoardImage): Promise<void> {
	await set(storageKey(projectId, image.elementId), image);
}

export async function removeMoodBoardImages(projectId: string, elementIds: string[]): Promise<void> {
	await Promise.all(elementIds.map((id) => del(storageKey(projectId, id))));
}

export async function restoreMoodBoardImages(project: LogoProject): Promise<LogoProject> {
	if (project.kind !== 'design' || !project.generation?.layoutId.startsWith('moodboard:')) return project;
	const elements = project.variants.primary;
	const restored = await Promise.all(elements.map(async (element) => {
		if (element.fieldName !== 'moodboardImage' || element.src) return element;
		const image = await get<StoredMoodBoardImage>(storageKey(project.id, element.id));
		return image ? { ...element, src: image.dataUrl, name: image.name } : element;
	}));
	return { ...project, variants: { ...project.variants, primary: restored } };
}

export async function storeMoodBoardImagesFromProject(project: LogoProject): Promise<void> {
	if (project.kind !== 'design' || !project.generation?.layoutId.startsWith('moodboard:')) return;
	const images = project.variants.primary.filter((element): element is Element & { src: string } => (
		element.fieldName === 'moodboardImage' && typeof element.src === 'string'
	));
	for (const element of images) {
		const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(element.src);
		if (!match) continue;
		const binary = atob(match[2]);
		const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
		await saveMoodBoardImage(project.id, {
			elementId: element.id,
			name: element.name ?? 'Mood board image',
			blob: new Blob([bytes], { type: match[1] }),
			dataUrl: element.src,
		});
	}
}
