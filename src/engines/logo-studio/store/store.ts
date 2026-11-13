import { create } from 'zustand';
import { createDefaultProject, type Element, type LogoProject } from '../model/types';
import { createAutomaticVariant, primarySignature, STANDARD_VARIANTS } from '../variants/automatic';

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

function updateGroupPaint(element: Element, patch: Partial<Pick<Element, 'fill' | 'stroke'>>): Element {
	return {
		...element,
		...patch,
		...(element.children ? { children: element.children.map((child) => updateGroupPaint(child, patch)) } : {}),
	};
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

function cloneWithFreshIdsOnly(element: Element): Element {
	return {
		...clone(element),
		id: freshId(),
		children: element.children?.map(cloneWithFreshIdsOnly),
	};
}

function updateProjectElements(
	project: LogoProject,
	update: (elements: Element[]) => Element[],
	variant = 'primary',
): LogoProject {
	return {
		...project,
		updatedAt: Date.now(),
		variants: {
			...project.variants,
			[variant]: update(project.variants[variant] ?? []),
		},
	};
}

interface LogoStudioState {
	project: LogoProject;
	activeVariant: string;
	selectedId: string | null;
	selectedIds: string[];
	past: LogoProject[];
	future: LogoProject[];
	clipboard: Element | null;
	loadProject: (project: LogoProject) => void;
	setActiveVariant: (name: string) => void;
	createFromPrimary: (name: string) => void;
	duplicateCurrentVariant: () => void;
	resetCurrentVariant: () => void;
	rebuildVariant: (name: string, monochromeColor?: string) => void;
	setVariantBackground: (background: string) => void;
	select: (id: string | null, extend?: boolean) => void;
	updateElement: (id: string, patch: Partial<Element>, recordHistory?: boolean) => void;
	addElement: (element: Element) => void;
	addElements: (elements: Element[]) => void;
	removeSelected: () => void;
	duplicateSelected: () => void;
	copySelected: () => void;
	paste: () => void;
	setBackground: (background: string) => void;
	reorderElement: (id: string, targetId: string) => void;
	groupSelected: () => void;
	ungroupSelected: () => void;
	alignSelected: (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom', toArtboard: boolean, width: number, height: number) => void;
	distributeSelected: (axis: 'horizontal' | 'vertical') => void;
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
		activeVariant: 'primary',
		selectedId: null,
		selectedIds: [],
		past: [],
		future: [],
		clipboard: null,
		loadProject: (project) => set({
			project: clone(project),
			activeVariant: 'primary',
			selectedId: null,
			selectedIds: [],
			past: [],
			future: [],
			clipboard: null,
		}),
		setActiveVariant: (name) => {
			const state = get();
			if (state.project.variants[name]) {
				set({ activeVariant: name, selectedId: null, selectedIds: [] });
				return;
			}
			if (!STANDARD_VARIANTS.includes(name as typeof STANDARD_VARIANTS[number])) return;
			const color = state.project.variantColors?.[name] ?? '#111111';
			const generated = createAutomaticVariant(state.project, name, color);
			const source = primarySignature(state.project.variants.primary ?? [], state.project.artboard.background);
			const project: LogoProject = {
				...state.project,
				updatedAt: Date.now(),
				variants: { ...state.project.variants, [name]: generated.elements },
				variantBackgrounds: { ...state.project.variantBackgrounds, [name]: generated.background },
				variantSources: { ...state.project.variantSources, [name]: source },
				...(name === 'monochrome' ? { variantColors: { ...state.project.variantColors, [name]: color } } : {}),
			};
			commitProject(project);
			set({ activeVariant: name, selectedId: null, selectedIds: [] });
		},
		createFromPrimary: (name) => {
			if (name === 'primary') return;
			const state = get();
			const color = state.project.variantColors?.[name] ?? '#111111';
			const generated = createAutomaticVariant(state.project, name, color);
			const source = primarySignature(state.project.variants.primary ?? [], state.project.artboard.background);
			commitProject({
				...state.project,
				updatedAt: Date.now(),
				variants: { ...state.project.variants, [name]: generated.elements },
				variantBackgrounds: { ...state.project.variantBackgrounds, [name]: generated.background },
				variantSources: { ...state.project.variantSources, [name]: source },
				...(name === 'monochrome' ? { variantColors: { ...state.project.variantColors, [name]: color } } : {}),
			});
			set({ activeVariant: name, selectedId: null, selectedIds: [] });
		},
		duplicateCurrentVariant: () => {
			const { project, activeVariant } = get();
			const sourceElements = project.variants[activeVariant] ?? [];
			let index = 2;
			while (project.variants[`variant-${index}`]) index += 1;
			const name = `variant-${index}`;
			const elements = sourceElements.map(cloneWithFreshIdsOnly);
			commitProject({
				...project,
				updatedAt: Date.now(),
				variants: { ...project.variants, [name]: elements },
				variantBackgrounds: { ...project.variantBackgrounds, [name]: project.variantBackgrounds?.[activeVariant] ?? project.artboard.background },
				variantSources: { ...project.variantSources, [name]: primarySignature(project.variants.primary ?? [], project.artboard.background) },
			});
			set({ activeVariant: name, selectedId: null, selectedIds: [] });
		},
		resetCurrentVariant: () => {
			const { project, activeVariant } = get();
			if (activeVariant === 'primary') return;
			const color = project.variantColors?.[activeVariant] ?? '#111111';
			const generated = createAutomaticVariant(project, activeVariant, color);
			commitProject({
				...project,
				updatedAt: Date.now(),
				variants: { ...project.variants, [activeVariant]: generated.elements },
				variantBackgrounds: { ...project.variantBackgrounds, [activeVariant]: generated.background },
				variantSources: {
					...project.variantSources,
					[activeVariant]: primarySignature(project.variants.primary ?? [], project.artboard.background),
				},
			});
			set({ selectedId: null, selectedIds: [] });
		},
		rebuildVariant: (name, monochromeColor) => {
			const { project } = get();
			const color = monochromeColor ?? project.variantColors?.[name] ?? '#111111';
			const generated = createAutomaticVariant(project, name, color);
			commitProject({
				...project,
				updatedAt: Date.now(),
				variants: { ...project.variants, [name]: generated.elements },
				variantBackgrounds: { ...project.variantBackgrounds, [name]: generated.background },
				variantSources: { ...project.variantSources, [name]: primarySignature(project.variants.primary ?? [], project.artboard.background) },
				...(name === 'monochrome' ? { variantColors: { ...project.variantColors, [name]: color } } : {}),
			});
		},
		setVariantBackground: (background) => {
			const { project, activeVariant } = get();
			const nextProject: LogoProject = activeVariant === 'primary'
				? { ...project, updatedAt: Date.now(), artboard: { ...project.artboard, background } }
				: {
					...project,
					updatedAt: Date.now(),
					variantBackgrounds: { ...project.variantBackgrounds, [activeVariant]: background },
				};
			commitProject(nextProject);
		},
		select: (id, extend = false) => set((state) => {
			if (!id) return { selectedId: null, selectedIds: [] };
			if (!extend) return { selectedId: id, selectedIds: [id] };
			const selectedIds = state.selectedIds.includes(id)
				? state.selectedIds.filter((selected) => selected !== id)
				: [...state.selectedIds, id];
			return { selectedId: selectedIds.includes(id) ? id : selectedIds.at(-1) ?? null, selectedIds };
		}),
		updateElement: (id, patch, recordHistory = true) => {
			const { project, activeVariant } = get();
			const currentElements = project.variants[activeVariant] ?? [];
			if (!findElement(currentElements, id)) return;
			const paintPatch: Partial<Pick<Element, 'fill' | 'stroke'>> = {};
			if (patch.fill !== undefined) paintPatch.fill = patch.fill;
			if (patch.stroke !== undefined) paintPatch.stroke = patch.stroke;
			const updated = updateProjectElements(project, (elements) => mapElements(
				elements,
				id,
				(element) => {
					const next = { ...element, ...patch };
					return element.type === 'group' && element.role === 'icon' && Object.keys(paintPatch).length
						? updateGroupPaint(next, paintPatch)
						: next;
				},
			).elements, activeVariant);
			commitProject(updated, recordHistory);
		},
		addElement: (element) => {
			const { project: current, activeVariant } = get();
			const project = updateProjectElements(current, (elements) => [...elements, element], activeVariant);
			commitProject(project);
			set({ selectedId: element.id, selectedIds: [element.id] });
		},
		addElements: (elements) => {
			if (!elements.length) return;
			const { project: current, activeVariant } = get();
			const project = updateProjectElements(current, (existing) => [...existing, ...elements], activeVariant);
			commitProject(project);
			set({ selectedId: elements[0].id, selectedIds: elements.map((element) => element.id) });
		},
		removeSelected: () => {
			const { project: current, selectedId, selectedIds, activeVariant } = get();
			const ids = selectedIds.length ? selectedIds : selectedId ? [selectedId] : [];
			if (!ids.length) return;
			const project = updateProjectElements(current, (elements) => ids.reduce(
				(next, id) => mapElements(next, id, () => null).elements,
				elements,
			), activeVariant);
			commitProject(project);
			set({ selectedId: null, selectedIds: [] });
		},
		duplicateSelected: () => {
			const { project, selectedId, activeVariant } = get();
			if (!selectedId) return;
			const source = findElement(project.variants[activeVariant] ?? [], selectedId);
			if (!source) return;
			const copy = cloneWithFreshIds(source);
			const duplicated = updateProjectElements(project, (elements) => [...elements, copy], activeVariant);
			commitProject(duplicated);
			set({ selectedId: copy.id, selectedIds: [copy.id] });
		},
		copySelected: () => {
			const { project, selectedId, activeVariant } = get();
			if (!selectedId) return;
			const element = findElement(project.variants[activeVariant] ?? [], selectedId);
			if (element) set({ clipboard: clone(element) });
		},
		paste: () => {
			const { clipboard: source, project: current, activeVariant } = get();
			if (!source) return;
			const element = cloneWithFreshIds(source);
			const project = updateProjectElements(current, (elements) => [...elements, element], activeVariant);
			commitProject(project);
			set({ selectedId: element.id, selectedIds: [element.id] });
		},
		setBackground: (background) => {
			get().setVariantBackground(background);
		},
		reorderElement: (id, targetId) => {
			if (id === targetId) return;
			const { project: current, activeVariant } = get();
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
			}, activeVariant);
			if (changed) commitProject(project);
		},
		groupSelected: () => {
			const { project: current, selectedIds, activeVariant } = get();
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
			}, activeVariant);
			if (!changed) return;
			commitProject(project);
			set({ selectedId: groupId, selectedIds: [groupId] });
		},
		ungroupSelected: () => {
			const { project: current, selectedId, activeVariant } = get();
			if (!selectedId) return;
			let childIds: string[] = [];
			const project = updateProjectElements(current, (elements) => {
				const result = replaceGroupWithChildren(elements, selectedId);
				childIds = result.children;
				return result.elements;
			}, activeVariant);
			if (!childIds.length) return;
			commitProject(project);
			set({ selectedId: childIds[0], selectedIds: childIds });
		},
		alignSelected: (alignment, toArtboard, width, height) => {
			const { project: current, selectedIds, selectedId, activeVariant } = get();
			const ids = selectedIds.length ? selectedIds : selectedId ? [selectedId] : [];
			if (!ids.length) return;
			const elements = ids.map((id) => findElement(current.variants[activeVariant] ?? [], id)).filter((element): element is Element => Boolean(element));
			if (!elements.length) return;
			const bounds = {
				left: Math.min(...elements.map((element) => element.x)),
				top: Math.min(...elements.map((element) => element.y)),
				right: Math.max(...elements.map((element) => element.x + element.width)),
				bottom: Math.max(...elements.map((element) => element.y + element.height)),
			};
			const patches = new Map<string, Partial<Element>>();
			for (const element of elements) {
				const x = alignment === 'left' ? (toArtboard ? 0 : bounds.left)
					: alignment === 'center' ? (toArtboard ? width / 2 : (bounds.left + bounds.right) / 2) - element.width / 2
						: alignment === 'right' ? (toArtboard ? width : bounds.right) - element.width : element.x;
				const y = alignment === 'top' ? (toArtboard ? 0 : bounds.top)
					: alignment === 'middle' ? (toArtboard ? height / 2 : (bounds.top + bounds.bottom) / 2) - element.height / 2
						: alignment === 'bottom' ? (toArtboard ? height : bounds.bottom) - element.height : element.y;
				patches.set(element.id, { x, y });
			}
			const project = updateProjectElements(current, (list) => ids.reduce((next, id) => {
				const patch = patches.get(id);
				return patch ? mapElements(next, id, (element) => ({ ...element, ...patch })).elements : next;
			}, list), activeVariant);
			commitProject(project);
		},
		distributeSelected: (axis) => {
			const { project: current, selectedIds, activeVariant } = get();
			if (selectedIds.length < 3) return;
			const elements = selectedIds.map((id) => findElement(current.variants[activeVariant] ?? [], id)).filter((element): element is Element => Boolean(element));
			if (elements.length < 3) return;
			const horizontal = axis === 'horizontal';
			const sorted = [...elements].sort((a, b) => horizontal ? a.x - b.x : a.y - b.y);
			const start = horizontal ? sorted[0].x : sorted[0].y;
			const end = horizontal
				? sorted[sorted.length - 1].x + sorted[sorted.length - 1].width
				: sorted[sorted.length - 1].y + sorted[sorted.length - 1].height;
			const totalSize = sorted.reduce((total, element) => total + (horizontal ? element.width : element.height), 0);
			const gap = (end - start - totalSize) / (sorted.length - 1);
			let cursor = start;
			const patches = new Map<string, Partial<Element>>();
			for (const element of sorted) {
				patches.set(element.id, horizontal ? { x: cursor } : { y: cursor });
				cursor += (horizontal ? element.width : element.height) + gap;
			}
			const project = updateProjectElements(current, (list) => sorted.reduce((next, element) => {
				const patch = patches.get(element.id);
				return patch ? mapElements(next, element.id, (item) => ({ ...item, ...patch })).elements : next;
			}, list), activeVariant);
			commitProject(project);
		},
		undo: () => {
			const { project, past, future } = get();
			if (!past.length) return;
			const previous = past[past.length - 1];
			set({
				project: previous,
				activeVariant: previous.variants[get().activeVariant] ? get().activeVariant : 'primary',
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
				activeVariant: next.variants[get().activeVariant] ? get().activeVariant : 'primary',
				past: [...past, clone(project)].slice(-HISTORY_LIMIT),
				future: remaining,
				selectedId: null,
				selectedIds: [],
			});
		},
	};
});

export const LOGO_HISTORY_LIMIT = HISTORY_LIMIT;
