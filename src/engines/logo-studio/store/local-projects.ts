import { del, get, set } from 'idb-keyval';
import type { LogoProject } from '../model/types';
import { validateLogoProject } from '../export/project-file';
import { exportProjectToSvg } from '../export/svg';

const PROJECT_INDEX_KEY = 'logo-studio:project-index:v1';
const LAST_PROJECT_KEY = 'logo-studio:last-project:v1';
const PROJECT_PREFIX = 'logo-studio:project:v1:';

export interface LocalProjectSummary {
	project: LogoProject;
	thumbnail: string;
}

function projectKey(id: string): string {
	return `${PROJECT_PREFIX}${id}`;
}

function projectIds(value: unknown): string[] {
	if (!Array.isArray(value) || !value.every((id) => typeof id === 'string')) return [];
	return value;
}

async function createThumbnail(project: LogoProject): Promise<string> {
	const { svg } = await exportProjectToSvg(project, { outlineText: false });
	return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export async function saveLocalProject(project: LogoProject, makeLast = true): Promise<void> {
	const validProject = validateLogoProject(project);
	const thumbnail = await createThumbnail(validProject);
	const ids = projectIds(await get<unknown>(PROJECT_INDEX_KEY));
	const nextIds = [project.id, ...ids.filter((id) => id !== project.id)];
	await set(projectKey(project.id), { project: validProject, thumbnail } satisfies LocalProjectSummary);
	await set(PROJECT_INDEX_KEY, nextIds);
	if (makeLast) await set(LAST_PROJECT_KEY, project.id);
}

export async function listLocalProjects(): Promise<LocalProjectSummary[]> {
	const ids = projectIds(await get<unknown>(PROJECT_INDEX_KEY));
	const projects = await Promise.all(ids.map(async (id) => {
		const value = await get<unknown>(projectKey(id));
		if (typeof value !== 'object' || value === null || !('project' in value)) return null;
		const record = value as { project: unknown; thumbnail?: unknown };
		const project = validateLogoProject(record.project);
		const thumbnail = typeof record.thumbnail === 'string' && record.thumbnail.startsWith('data:image/svg+xml')
			? record.thumbnail
			: await createThumbnail(project);
		return { project, thumbnail } satisfies LocalProjectSummary;
	}));
	return projects
		.filter((project): project is LocalProjectSummary => project !== null)
		.sort((a, b) => b.project.updatedAt - a.project.updatedAt);
}

export async function restoreLastProject(): Promise<LogoProject | null> {
	const lastId = await get<unknown>(LAST_PROJECT_KEY);
	const stored = typeof lastId === 'string' ? await get<unknown>(projectKey(lastId)) : undefined;
	if (typeof stored === 'object' && stored !== null && 'project' in stored) {
		return validateLogoProject((stored as { project: unknown }).project);
	}
	const [mostRecent] = await listLocalProjects();
	if (!mostRecent) return null;
	await set(LAST_PROJECT_KEY, mostRecent.project.id);
	return mostRecent.project;
}

export async function setLastProjectId(id: string): Promise<void> {
	await set(LAST_PROJECT_KEY, id);
}

export async function renameLocalProject(id: string, name: string): Promise<void> {
	const cleanName = name.trim();
	if (!cleanName || cleanName.length > 200) throw new Error('Project names must be between 1 and 200 characters.');
	const stored = await get<unknown>(projectKey(id));
	if (typeof stored !== 'object' || stored === null || !('project' in stored)) {
		throw new Error('This saved project could not be found.');
	}
	const record = stored as LocalProjectSummary;
	await saveLocalProject({ ...record.project, name: cleanName, updatedAt: Date.now() }, false);
}

export async function duplicateLocalProject(project: LogoProject): Promise<LogoProject> {
	const duplicate: LogoProject = {
		...structuredClone(project),
		id: globalThis.crypto?.randomUUID?.() ?? `logo-${Date.now()}-${Math.random().toString(36).slice(2)}`,
		name: `${project.name} copy`.slice(0, 200),
		updatedAt: Date.now(),
	};
	await saveLocalProject(duplicate, false);
	return duplicate;
}

export async function deleteLocalProject(id: string): Promise<void> {
	await del(projectKey(id));
	const ids = projectIds(await get<unknown>(PROJECT_INDEX_KEY));
	const remaining = ids.filter((entry) => entry !== id);
	if (remaining.length) await set(PROJECT_INDEX_KEY, remaining);
	else await del(PROJECT_INDEX_KEY);
	const lastId = await get<unknown>(LAST_PROJECT_KEY);
	if (lastId === id) {
		if (remaining.length) await set(LAST_PROJECT_KEY, remaining[0]);
		else await del(LAST_PROJECT_KEY);
	}
}
