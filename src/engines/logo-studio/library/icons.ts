export type LucideNode = [string, Record<string, string | number>];
export type LucideIconNodes = Record<string, LucideNode[]>;
export type LucideTags = Record<string, string[]>;

let libraryPromise: Promise<{ icons: LucideIconNodes; tags: LucideTags }> | undefined;

export function loadLucideLibrary(): Promise<{ icons: LucideIconNodes; tags: LucideTags }> {
	libraryPromise ??= Promise.all([
		import('lucide-static/icon-nodes.json'),
		import('lucide-static/tags.json'),
	]).then(([iconModule, tagModule]) => ({
		icons: iconModule.default as LucideIconNodes,
		tags: tagModule.default as LucideTags,
	})).catch((error: unknown) => {
		libraryPromise = undefined;
		throw error;
	});
	return libraryPromise;
}

export function formatIconName(name: string): string {
	return name.split('-').map((part) => part[0]?.toUpperCase() + part.slice(1)).join(' ');
}

export function matchesIconCategory(name: string, tags: string[], category: string): boolean {
	if (category === 'All') return true;
	const searchable = `${name.replaceAll('-', ' ')} ${tags.join(' ')}`.toLowerCase();
	const terms: Record<string, string[]> = {
		Arrows: ['arrow', 'direction', 'move', 'navigation', 'upward', 'downward', 'leftward', 'rightward'],
		Business: ['business', 'work', 'office', 'finance', 'chart', 'commerce', 'company', 'money'],
		Nature: ['nature', 'plant', 'flower', 'tree', 'leaf', 'animal', 'weather', 'earth', 'water'],
		Objects: ['object', 'tool', 'device', 'household', 'food', 'clothing', 'transportation', 'music'],
		Symbols: ['symbol', 'shape', 'mark', 'sign', 'heart', 'star', 'plus', 'minus', 'check'],
	};
	return (terms[category] ?? []).some((term) => searchable.includes(term));
}

const svgTags = new Set(['path', 'circle', 'ellipse', 'line', 'polygon', 'polyline', 'rect']);

export function renderLucideNodesToSvg(nodes: LucideNode[]): string {
	return nodes.map(([tag, attributes]) => {
		if (!svgTags.has(tag)) return '';
		const markup = Object.entries(attributes).map(([name, value]) => {
			const safeName = name.replace(/[A-Z]/g, (character) => `-${character.toLowerCase()}`);
			return ` ${safeName}="${String(value).replace(/[&<>"']/g, (character) => ({
				'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
			})[character] ?? character)}"`;
		}).join('');
		return `<${tag}${markup}/>`;
	}).join('');
}
