import type { LogoProject } from '../model/types';
import { exportProjectToSvg } from '../export/svg';
import type { MockupScene, MockupSlot, SceneColorParameter } from './scenes/types';

export type MockupColors = Record<SceneColorParameter, string>;

const safeColor = (value: string): string => /^#[\da-f]{3,8}$/i.test(value) ? value : '#ffffff';

function slotTransform(slot: MockupSlot): string {
	return `translate(${slot.x} ${slot.y}) rotate(${slot.rotation} ${slot.width / 2} ${slot.height / 2}) skewX(${slot.skewX ?? 0}) skewY(${slot.skewY ?? 0})`;
}

function renderClip(sceneId: string, slot: MockupSlot): { id: string; markup: string } | null {
	if (!slot.clip) return null;
	const id = `${sceneId}-${slot.id}-clip`;
	const clip = slot.clip;
	let shape: string;
	if (clip.shape === 'circle') {
		const radius = clip.radius ?? Math.min(slot.width, slot.height) / 2;
		shape = `<circle cx="${clip.x ?? slot.width / 2}" cy="${clip.y ?? slot.height / 2}" r="${radius}"/>`;
	} else if (clip.shape === 'ellipse') {
		shape = `<ellipse cx="${clip.x ?? slot.width / 2}" cy="${clip.y ?? slot.height / 2}" rx="${clip.width ?? slot.width / 2}" ry="${clip.height ?? slot.height / 2}"/>`;
	} else {
		shape = `<rect x="${clip.x ?? 0}" y="${clip.y ?? 0}" width="${clip.width ?? slot.width}" height="${clip.height ?? slot.height}" rx="${clip.radius ?? 0}"/>`;
	}
	return { id, markup: `<clipPath id="${id}">${shape}</clipPath>` };
}

export async function renderMockupSvg(
	scene: MockupScene,
	project: LogoProject,
	colors: MockupColors,
	options: { variant?: string; includeBackground?: boolean } = {},
): Promise<{ svg: string; warnings: string[]; missingVariants: string[] }> {
	const warnings: string[] = [];
	const missingVariants: string[] = [];
	const defs: string[] = [];
	const background = Object.entries(colors).reduce(
		(svg, [name, value]) => svg.replaceAll(`{{${name}}}`, safeColor(value)),
		scene.background,
	);
	const slots: string[] = [];

	for (const slot of scene.slots) {
		const preferred = options.variant && options.variant !== 'preferred'
			? options.variant
			: slot.preferredVariant;
		const variant = project.variants[preferred] ? preferred : 'primary';
		if (variant !== preferred && !missingVariants.includes(preferred)) missingVariants.push(preferred);
		const elements = project.variants[variant] ?? [];
		const slotProject: LogoProject = {
			...project,
			artboard: { ...project.artboard, background: 'transparent' },
			variants: { [variant]: elements },
		};
		const exported = await exportProjectToSvg(slotProject, { outlineText: true, background: 'transparent' });
		warnings.push(...exported.warnings);
		const clip = renderClip(scene.id, slot);
		if (clip) defs.push(clip.markup);
		const inset = Math.min(Math.max(0, slot.padding), Math.min(slot.width, slot.height) / 2);
		const viewportWidth = Math.max(1, slot.width - inset * 2);
		const viewportHeight = Math.max(1, slot.height - inset * 2);
		const clipAttribute = clip ? ` clip-path="url(#${clip.id})"` : '';
		const blend = slot.blendMode && slot.blendMode !== 'normal'
			? ` style="mix-blend-mode:${slot.blendMode}"`
			: '';
		const idPrefix = `${scene.id}-${slot.id}-`;
		const innerSvg = exported.svg
			.replace(/^[\s\S]*?<svg[^>]*>|<\/svg>\s*$/g, '')
			.replace(/\bid="([^"]+)"/g, (_match, id: string) => `id="${idPrefix}${id}"`)
			.replace(/url\(#([^)]+)\)/g, (_match, id: string) => `url(#${idPrefix}${id})`);
		slots.push(`<g transform="${slotTransform(slot)}" opacity="${Math.min(1, Math.max(0, slot.opacity))}"${clipAttribute}${blend}><svg x="${inset}" y="${inset}" width="${viewportWidth}" height="${viewportHeight}" viewBox="0 0 ${project.artboard.width} ${project.artboard.height}" preserveAspectRatio="xMidYMid meet">${innerSvg}</svg></g>`);
	}

	const backgroundMarkup = options.includeBackground === false
		? '<rect width="100%" height="100%" fill="#eeeeea"/>'
		: background;
	const [, , width, height] = scene.viewBox.trim().split(/\s+/).map(Number);
	const svg = `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${scene.viewBox}"><defs>${defs.join('')}</defs>${backgroundMarkup}${slots.join('')}</svg>`;
	return { svg, warnings: Array.from(new Set(warnings)), missingVariants };
}

export function getSceneSurfaceColor(scene: MockupScene, colors: MockupColors, slot = scene.slots[0]): string {
	return safeColor(colors[slot?.surfaceParameter ?? 'surface']);
}

export function relativeLuminance(color: string): number {
	const hex = safeColor(color).slice(1);
	const normalized = hex.length === 3 ? hex.split('').map((part) => part + part).join('') : hex.slice(0, 6);
	const channels = [0, 2, 4].map((index) => parseInt(normalized.slice(index, index + 2), 16) / 255);
	const linear = channels.map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
	return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

export function createSceneColors(scene: MockupScene): MockupColors {
	return Object.fromEntries(
		Object.entries(scene.colors).map(([name, color]) => [name, color.value]),
	) as MockupColors;
}
