import { logoPalettes, type LogoPalette } from '../library/palettes';
import type { Element, LogoProject } from '../model/types';
import { logoLayouts } from '../templates/layouts';
import { styleRules } from '../templates/rules';

export const STANDARD_VARIANTS = [
	'primary',
	'secondary',
	'horizontal',
	'vertical',
	'icon-only',
	'wordmark-only',
	'black',
	'white',
	'monochrome',
	'transparent',
] as const;

export type StandardVariant = typeof STANDARD_VARIANTS[number];

export function variantLabel(name: string): string {
	return name.split(/[-\s]+/).map((part) => part ? `${part[0].toUpperCase()}${part.slice(1)}` : '').join(' ');
}

export function primarySignature(elements: Element[], background?: string): string {
	return JSON.stringify([elements, background]);
}

function cloneWithVariantIds(elements: Element[], variant: string): Element[] {
	let index = 0;
	const clone = (element: Element): Element => {
		index += 1;
		return {
			...structuredClone(element),
			id: `${element.id}-${variant}-${index}`.replace(/[^a-zA-Z0-9_-]/g, '-'),
			children: element.children?.map(clone),
		};
	};
	return elements.map(clone);
}

function roleSubset(elements: Element[], roleSet: Set<Element['role']>): Element[] {
	return elements.flatMap((element) => {
		if (roleSet.has(element.role)) return [structuredClone(element)];
		if (element.type !== 'group' || !element.children) return [];
		const children = roleSubset(element.children, roleSet);
		return children.length ? [{ ...structuredClone(element), children }] : [];
	});
}

function resizeChildren(elements: Element[], scale: number): Element[] {
	return elements.map((element) => ({
		...element,
		x: element.x * scale,
		y: element.y * scale,
		width: element.width * scale,
		height: element.height * scale,
		fontSize: element.fontSize === undefined ? undefined : element.fontSize * scale,
		strokeWidth: element.strokeWidth === undefined ? undefined : element.strokeWidth * scale,
		children: element.children ? resizeChildren(element.children, scale) : undefined,
	}));
}

export function fitAndCenter(elements: Element[], width: number, height: number, margin = 0.12): Element[] {
	if (!elements.length) return [];
	const left = Math.min(...elements.map((element) => element.x));
	const top = Math.min(...elements.map((element) => element.y));
	const right = Math.max(...elements.map((element) => element.x + element.width));
	const bottom = Math.max(...elements.map((element) => element.y + element.height));
	const boundsWidth = Math.max(1, right - left);
	const boundsHeight = Math.max(1, bottom - top);
	const scale = Math.min((width * (1 - margin * 2)) / boundsWidth, (height * (1 - margin * 2)) / boundsHeight);
	const scaled = resizeChildren(elements, scale);
	const scaledWidth = boundsWidth * scale;
	const scaledHeight = boundsHeight * scale;
	const offsetX = (width - scaledWidth) / 2 - left * scale;
	const offsetY = (height - scaledHeight) / 2 - top * scale;
	return scaled.map((element) => ({ ...element, x: element.x + offsetX, y: element.y + offsetY }));
}

function monochrome(elements: Element[], color: string): Element[] {
	return elements.map((element) => {
		const hadGradient = Boolean(element.gradient);
		const fill = element.fill;
		const stroke = element.stroke;
		return {
			...element,
			fill: fill === 'none' ? 'none' : fill !== undefined || hadGradient || element.type === 'text' ? color : undefined,
			stroke: stroke === 'none' ? 'none' : stroke !== undefined || hadGradient ? color : undefined,
			gradient: undefined,
			children: element.children ? monochrome(element.children, color) : undefined,
		};
	});
}

function generatedLayout(project: LogoProject, variant: 'horizontal' | 'vertical'): Element[] | null {
	const generation = project.generation;
	const brief = project.brief;
	if (!generation || !brief) return null;
	const palette: LogoPalette | undefined = logoPalettes.find((item) => item.name === generation.paletteName)
		?? (generation.paletteName === 'Custom' && brief.customColor
			? { name: 'Custom', colors: [brief.customColor, '#ffffff', '#737373', '#111111'] }
			: undefined);
	if (!palette) return null;
	const arrangement = variant === 'horizontal' ? 'icon-left' : 'icon-above-text';
	const permitted = new Set(styleRules[brief.style].layouts);
	const layoutOptions = logoLayouts.filter((item) => {
		if (!permitted.has(item.id)) return false;
		if (generation.icon === 'none') {
			return variant === 'horizontal'
				? item.id === 'initial-name' && item.arrangements.includes(arrangement)
				: ['text-only', 'underline-wordmark', 'two-line-wordmark'].includes(item.id);
		}
		return item.arrangements.includes(arrangement);
	});
	const layout = layoutOptions[ Math.abs(Math.trunc(generation.seed)) % Math.max(1, layoutOptions.length) ];
	if (!layout) return null;
	return layout.build({
		brief: { ...brief, arrangement },
		palette,
		fontPair: generation.fontPair,
		icon: generation.icon,
	});
}

export function createAutomaticVariant(project: LogoProject, name: string, monochromeColor = '#111111'): {
	elements: Element[];
	background: string;
	requiresManualArrangement: boolean;
} {
	const primary = project.variants.primary ?? [];
	let elements: Element[];
	let background = project.artboard.background;
	let requiresManualArrangement = false;

	switch (name) {
		case 'icon-only':
			elements = fitAndCenter(roleSubset(primary, new Set(['icon'])), project.artboard.width, project.artboard.height);
			break;
		case 'wordmark-only':
			elements = fitAndCenter(roleSubset(primary, new Set(['name', 'tagline'])), project.artboard.width, project.artboard.height);
			break;
		case 'black':
			elements = monochrome(primary, '#000000');
			break;
		case 'white':
			elements = monochrome(primary, '#ffffff');
			background = '#202020';
			break;
		case 'monochrome':
			elements = monochrome(primary, monochromeColor);
			break;
		case 'transparent':
			elements = structuredClone(primary);
			background = 'transparent';
			break;
		case 'horizontal':
		case 'vertical': {
			const generated = generatedLayout(project, name);
			elements = generated ?? structuredClone(primary);
			requiresManualArrangement = !generated;
			break;
		}
		default:
			elements = structuredClone(primary);
	}

	elements = cloneWithVariantIds(elements, name);
	return { elements, background, requiresManualArrangement };
}
