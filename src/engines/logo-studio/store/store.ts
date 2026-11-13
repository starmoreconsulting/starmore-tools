import { create } from 'zustand';
import { createDefaultProject, type Element, type LogoProject } from '../model/types';

const HISTORY_LIMIT = 100;

function clone<T>(value: T): T {
	return structuredClone(value);
}

function cloneWithFreshIds(element: Element): Element {
	return {
		...clone(element),
		id: globalThis.crypto?.randomUUID?.() ?? `logo-${Date.now()}-${Math.random().toString(36).slice(2)}`,
		x: element.x + 16,
		y: element.y + 16,
		children: element.children?.map(cloneWithFreshIds),
	};
}

function mapElements(
	elements: Element[],
	id: string,
	mapper: (element: Element) => Element | null,
): { elements: Element[]; changed: boolean } {
	let changed = false;
	const result: Element[] = [];

	for (const element of elements) {
		if (element.id === id) {
			changed = true;
			const mapped = mapper(element);
			if (mapped) result.push(mapped);
			continue;
		}
		if (element.children) {
			const nested = mapElements(element.children, id, mapper);
			if (nested.changed) {
				changed = true;
				result.push({ ...element, children: nested.elements });
				continue;
			}
		}
		result.push(element);
	}

	return { elements: changed ? result : elements, changed };
}

function findElement(elements: Element[], id: string): Element | null {
	for (const element of elements) {
		if (element.id === id) return element;
		const nested = element.children && findElement(element.children, id);
		if (nested) return nested;
	}
	return null;
}

function updateProjectElements(
	project: LogoProject,
	update: (elements: Element[]) => Element[],
): LogoProject {
	return {
		...project,
		updatedAt: Date.now(),
		variants: {
			...project.variants,
			primary: update(project.variants.primary ?? []),
		},
	};
}

interface LogoStudioState {
	project: LogoProject;
	selectedId: string | null;
	past: LogoProject[];
	future: LogoProject[];
	clipboard: Element | null;
	select: (id: string | null) => void;
	updateElement: (id: string, patch: Partial<Element>, recordHistory?: boolean) => void;
	addElement: (element: Element) => void;
	removeSelected: () => void;
	duplicateSelected: () => void;
	copySelected: () => void;
	paste: () => void;
	setBackground: (background: string) => void;
	undo: () => void;
	redo: () => void;
}

export const useLogoStudioStore = create<LogoStudioState>()((set, get) => {
	const commitProject = (project: LogoProject, recordHistory = true) => {
		const current = get().project;
		set((state) => ({
			project,
			past: recordHistory ? [...state.past, clone(current)].slice(-HISTORY_LIMIT) : state.past,
			future: recordHistory ? [] : state.future,
		}));
	};

	return {
		project: createDefaultProject(),
		selectedId: null,
		past: [],
		future: [],
		clipboard: null,
		select: (id) => set({ selectedId: id }),
		updateElement: (id, patch, recordHistory = true) => {
			const project = get().project;
			const currentElements = project.variants.primary ?? [];
			if (!findElement(currentElements, id)) return;
			const updated = updateProjectElements(project, (elements) => mapElements(
				elements,
				id,
				(element) => ({ ...element, ...patch }),
			).elements);
			commitProject(updated, recordHistory);
		},
		addElement: (element) => {
			const project = updateProjectElements(get().project, (elements) => [...elements, element]);
			commitProject(project);
			set({ selectedId: element.id });
		},
		removeSelected: () => {
			const id = get().selectedId;
			if (!id) return;
			const project = updateProjectElements(get().project, (elements) => mapElements(elements, id, () => null).elements);
			commitProject(project);
			set({ selectedId: null });
		},
		duplicateSelected: () => {
			const { project, selectedId } = get();
			if (!selectedId) return;
			const source = findElement(project.variants.primary ?? [], selectedId);
			if (!source) return;
			const copy = cloneWithFreshIds(source);
			const duplicated = updateProjectElements(project, (elements) => [...elements, copy]);
			commitProject(duplicated);
			set({ selectedId: copy.id });
		},
		copySelected: () => {
			const { project, selectedId } = get();
			if (!selectedId) return;
			const element = findElement(project.variants.primary ?? [], selectedId);
			if (element) set({ clipboard: clone(element) });
		},
		paste: () => {
			const source = get().clipboard;
			if (!source) return;
			const element = cloneWithFreshIds(source);
			const project = updateProjectElements(get().project, (elements) => [...elements, element]);
			commitProject(project);
			set({ selectedId: element.id });
		},
		setBackground: (background) => {
			const project = get().project;
			commitProject({
				...project,
				updatedAt: Date.now(),
				artboard: { ...project.artboard, background },
			});
		},
		undo: () => {
			const { project, past, future } = get();
			if (!past.length) return;
			const previous = past[past.length - 1];
			set({
				project: previous,
				past: past.slice(0, -1),
				future: [clone(project), ...future].slice(0, HISTORY_LIMIT),
				selectedId: null,
			});
		},
		redo: () => {
			const { project, past, future } = get();
			if (!future.length) return;
			const [next, ...remaining] = future;
			set({
				project: next,
				past: [...past, clone(project)].slice(-HISTORY_LIMIT),
				future: remaining,
				selectedId: null,
			});
		},
	};
});

export const LOGO_HISTORY_LIMIT = HISTORY_LIMIT;
