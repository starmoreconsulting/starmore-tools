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

function updateSiblingList(
	elements: Element[],
	ids: string[],
	update: (siblings: Element[]) => Element[],
): { elements: Element[]; changed: boolean } {
	if (ids.every((id) => elements.some((element) => element.id === id))) {
		return { elements: update(elements), changed: true };
	}
	for (let index = 0; index < elements.length; index += 1) {
		const element = elements[index];
		if (!element.children) continue;
		const nested = updateSiblingList(element.children, ids, update);
		if (nested.changed) {
			const result = [...elements];
			result[index] = { ...element, children: nested.elements };
			return { elements: result, changed: true };
		}
	}
	return { elements, changed: false };
}

function replaceGroupWithChildren(elements: Element[], id: string): { elements: Element[]; children: string[] } {
	const result: Element[] = [];
	let children: string[] = [];
	for (const element of elements) {
		if (element.id === id && element.type === 'group') {
			const moved = (element.children ?? []).map((child) => ({
				...child,
				x: child.x + element.x,
				y: child.y + element.y,
			}));
			result.push(...moved);
			children = moved.map((child) => child.id);
			continue;
		}
		if (element.children) {
			const nested = replaceGroupWithChildren(element.children, id);
			if (nested.children.length) {
				result.push({ ...element, children: nested.elements });
				children = nested.children;
				continue;
			}
		}
		result.push(element);
	}
	return { elements: children.length ? result : elements, children };
}

function freshId(): string {
	return globalThis.crypto?.randomUUID?.() ?? `logo-${Date.now()}-${Math.random().toString(36).slice(2)}`;
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
	selectedIds: string[];
	past: LogoProject[];
	future: LogoProject[];
	clipboard: Element | null;
	loadProject: (project: LogoProject) => void;
	select: (id: string | null, extend?: boolean) => void;
	updateElement: (id: string, patch: Partial<Element>, recordHistory?: boolean) => void;
	addElement: (element: Element) => void;
	removeSelected: () => void;
	duplicateSelected: () => void;
	copySelected: () => void;
	paste: () => void;
	setBackground: (background: string) => void;
	reorderElement: (id: string, targetId: string) => void;
	groupSelected: () => void;
	ungroupSelected: () => void;
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
		selectedIds: [],
		past: [],
		future: [],
		clipboard: null,
		loadProject: (project) => set({
			project: clone(project),
			selectedId: null,
			selectedIds: [],
			past: [],
			future: [],
			clipboard: null,
		}),
		select: (id, extend = false) => set((state) => {
			if (!id) return { selectedId: null, selectedIds: [] };
			if (!extend) return { selectedId: id, selectedIds: [id] };
			const selectedIds = state.selectedIds.includes(id)
				? state.selectedIds.filter((selected) => selected !== id)
				: [...state.selectedIds, id];
			return { selectedId: selectedIds.includes(id) ? id : selectedIds.at(-1) ?? null, selectedIds };
		}),
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
			set({ selectedId: element.id, selectedIds: [element.id] });
		},
		removeSelected: () => {
			const { project: current, selectedId, selectedIds } = get();
			const ids = selectedIds.length ? selectedIds : selectedId ? [selectedId] : [];
			if (!ids.length) return;
			const project = updateProjectElements(current, (elements) => ids.reduce(
				(next, id) => mapElements(next, id, () => null).elements,
				elements,
			));
			commitProject(project);
			set({ selectedId: null, selectedIds: [] });
		},
		duplicateSelected: () => {
			const { project, selectedId } = get();
			if (!selectedId) return;
			const source = findElement(project.variants.primary ?? [], selectedId);
			if (!source) return;
			const copy = cloneWithFreshIds(source);
			const duplicated = updateProjectElements(project, (elements) => [...elements, copy]);
			commitProject(duplicated);
			set({ selectedId: copy.id, selectedIds: [copy.id] });
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
			set({ selectedId: element.id, selectedIds: [element.id] });
		},
		setBackground: (background) => {
			const project = get().project;
			commitProject({
				...project,
				updatedAt: Date.now(),
				artboard: { ...project.artboard, background },
			});
		},
		reorderElement: (id, targetId) => {
			if (id === targetId) return;
			const current = get().project;
			let changed = false;
			const project = updateProjectElements(current, (elements) => {
				const result = updateSiblingList(elements, [id, targetId], (siblings) => {
					const from = siblings.findIndex((element) => element.id === id);
					const to = siblings.findIndex((element) => element.id === targetId);
					const next = [...siblings];
					const [moved] = next.splice(from, 1);
					next.splice(to, 0, moved);
					return next;
				});
				changed = result.changed;
				return result.elements;
			});
			if (changed) commitProject(project);
		},
		groupSelected: () => {
			const { project: current, selectedIds } = get();
			if (selectedIds.length < 2) return;
			const groupId = freshId();
			let changed = false;
			const project = updateProjectElements(current, (elements) => {
				const result = updateSiblingList(elements, selectedIds, (siblings) => {
					const chosen = siblings.filter((element) => selectedIds.includes(element.id));
					const x = Math.min(...chosen.map((element) => element.x));
					const y = Math.min(...chosen.map((element) => element.y));
					const right = Math.max(...chosen.map((element) => element.x + element.width));
					const bottom = Math.max(...chosen.map((element) => element.y + element.height));
					const group: Element = {
						id: groupId,
						type: 'group',
						name: 'Group',
						x,
						y,
						width: right - x,
						height: bottom - y,
						rotation: 0,
						opacity: 1,
						locked: false,
						visible: true,
						children: chosen.map((element) => ({ ...element, x: element.x - x, y: element.y - y })),
					};
					const first = Math.min(...chosen.map((element) => siblings.indexOf(element)));
					const remaining = siblings.filter((element) => !selectedIds.includes(element.id));
					remaining.splice(first, 0, group);
					return remaining;
				});
				changed = result.changed;
				return result.elements;
			});
			if (!changed) return;
			commitProject(project);
			set({ selectedId: groupId, selectedIds: [groupId] });
		},
		ungroupSelected: () => {
			const { project: current, selectedId } = get();
			if (!selectedId) return;
			let childIds: string[] = [];
			const project = updateProjectElements(current, (elements) => {
				const result = replaceGroupWithChildren(elements, selectedId);
				childIds = result.children;
				return result.elements;
			});
			if (!childIds.length) return;
			commitProject(project);
			set({ selectedId: childIds[0], selectedIds: childIds });
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
				selectedIds: [],
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
				selectedIds: [],
			});
		},
	};
});

export const LOGO_HISTORY_LIMIT = HISTORY_LIMIT;
