import type { BrandKit, BrandProfile } from '../../logo-studio/brand/kit';
import { fitTextToBox } from '../../logo-studio/templates/layouts/helpers';
import type { Element, LogoProject } from '../../logo-studio/model/types';
import { generateDesign, getDesignDimensions, type DesignOptions, type DesignType } from './generate';

export type DesignResizeMode = 'regenerate' | 'scale' | 'keep';
export type DesignResizeTarget = DesignType | { type: DesignType; cardSize?: DesignOptions['cardSize'] };

export interface ResizeDesignOptions {
	kit?: BrandKit;
	profile?: BrandProfile;
}

export interface ResizeDesignResult {
	project: LogoProject;
	mode: DesignResizeMode;
	note?: string;
	warnings: string[];
}

function targetDetails(target: DesignResizeTarget): { type: DesignType; options: DesignOptions } {
	if (typeof target === 'string') return { type: target, options: {} };
	return { type: target.type, options: { cardSize: target.cardSize } };
}

function resizeElement(
	element: Element,
	scale: number,
	offsetX: number,
	offsetY: number,
	root: boolean,
	newWidth: number,
	newHeight: number,
	warnings: string[],
): Element {
	if (element.role === 'background') {
		return {
			...structuredClone(element),
			x: 0,
			y: 0,
			width: newWidth,
			height: newHeight,
			...(element.type === 'image' ? { fit: 'cover' as const } : {}),
		};
	}
	const next: Element = {
		...structuredClone(element),
		x: element.x * scale + (root ? offsetX : 0),
		y: element.y * scale + (root ? offsetY : 0),
		width: element.width * scale,
		height: element.height * scale,
		rotation: element.rotation,
		strokeWidth: element.strokeWidth === undefined ? undefined : element.strokeWidth * scale,
		letterSpacing: element.letterSpacing === undefined ? undefined : element.letterSpacing * scale,
		shadow: element.shadow ? {
			...element.shadow,
			offsetX: element.shadow.offsetX * scale,
			offsetY: element.shadow.offsetY * scale,
			blur: element.shadow.blur * scale,
		} : undefined,
		children: element.children?.map((child) => resizeElement(child, scale, 0, 0, false, newWidth, newHeight, warnings)),
	};
	if (element.type === 'text' && element.text) {
		const fit = fitTextToBox(element.text, next, (element.fontSize ?? 48) * scale, (element.letterSpacing ?? 0) * scale, { minimumFontSize: 8 });
		next.text = fit.text;
		next.fontSize = fit.fontSize;
		if (fit.overflow) warnings.push(`The “${element.fieldName ?? element.name ?? 'text'}” field may overflow after resizing.`);
	}
	return next;
}

function fittedElements(project: LogoProject, width: number, height: number, warnings: string[], keep: boolean): Element[] {
	const oldWidth = project.artboard.width;
	const oldHeight = project.artboard.height;
	const scale = keep ? 1 : Math.min(width / oldWidth, height / oldHeight);
	const offsetX = keep ? 0 : (width - oldWidth * scale) / 2;
	const offsetY = keep ? 0 : (height - oldHeight * scale) / 2;
	return (project.variants.primary ?? []).map((element) => resizeElement(
		element, scale, offsetX, offsetY, true, width, height, warnings,
	));
}

export function resizeDesign(
	design: LogoProject,
	targetPreset: DesignResizeTarget,
	mode: DesignResizeMode,
	options: ResizeDesignOptions = {},
): ResizeDesignResult {
	if (design.kind !== 'design') throw new Error('Only Brand Studio designs can be resized with this tool.');
	const target = targetDetails(targetPreset);
	const sizeOptions: DesignOptions = target.options;
	if (target.type.startsWith('business-card') && sizeOptions.cardSize === undefined
		&& design.artboard.width === 88.9) sizeOptions.cardSize = '3.5x2in';
	const dimensions = getDesignDimensions(target.type, sizeOptions);
	const warnings: string[] = [];

	if (mode === 'regenerate' && design.generation?.edited !== true && options.kit) {
		const layout = design.generation?.layoutId.split(':')[1] ?? 'centered';
		const regenerated = generateDesign(target.type, layout, options.kit, options.profile ?? options.kit.profile, sizeOptions);
		return {
			project: { ...regenerated.project, id: design.id, name: design.name, updatedAt: Date.now() },
			mode: 'regenerate',
			warnings: regenerated.warnings,
		};
	}

	let resolvedMode = mode;
	let note: string | undefined;
	if (mode === 'regenerate') {
		resolvedMode = 'scale';
		note = design.generation?.edited
			? 'This design has been hand-edited, so it was resized by scaling instead of regenerating.'
			: 'No active brand kit is available, so the design was resized by scaling instead of regenerating.';
	}
	const keep = resolvedMode === 'keep';
	const project: LogoProject = {
		...structuredClone(design),
		updatedAt: Date.now(),
		artboard: { ...design.artboard, width: dimensions.width, height: dimensions.height },
		variants: {
			...design.variants,
			primary: fittedElements(design, dimensions.width, dimensions.height, warnings, keep),
		},
		...(design.generation ? {
			generation: {
				...design.generation,
				layoutId: `${target.type}:${design.generation.layoutId.split(':')[1] ?? 'centered'}`,
				edited: true,
			},
		} : {}),
	};
	return { project, mode: resolvedMode, ...(note ? { note } : {}), warnings: [...new Set(warnings)] };
}
