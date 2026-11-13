import type { Element, LogoProject } from '../model/types';
import { outlineProjectText } from './outline';
import { loadLucideLibrary, renderLucideNodesToSvg } from '../library/icons';

export interface SvgExportOptions {
	outlineText?: boolean;
	background?: string;
}

export interface SvgExportResult {
	svg: string;
	warnings: string[];
}

function escapeXml(value: string): string {
	return value.replace(/[&<>"']/g, (character) => ({
		'&': '&amp;',
		'<': '&lt;',
		'>': '&gt;',
		'"': '&quot;',
		"'": '&apos;',
	})[character] ?? character);
}

function renderShape(element: Element): string {
	const fill = element.shape === 'line' ? 'none' : escapeXml(element.fill ?? '#d7ed79');
	const stroke = escapeXml(element.stroke ?? (element.shape === 'line' ? '#203b32' : 'none'));
	const strokeWidth = Math.max(0, element.strokeWidth ?? 2);

	switch (element.shape) {
		case 'circle':
			return `<ellipse cx="${element.width / 2}" cy="${element.height / 2}" rx="${element.width / 2}" ry="${element.height / 2}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`;
		case 'triangle':
			return `<polygon points="${element.width / 2},0 ${element.width},${element.height} 0,${element.height}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`;
		case 'star': {
			const radius = Math.min(element.width, element.height) / 2;
			const points = Array.from({ length: 10 }, (_, index) => {
				const r = index % 2 === 0 ? radius : radius * 0.43;
				const angle = -Math.PI / 2 + index * Math.PI / 5;
				return `${element.width / 2 + Math.cos(angle) * r},${element.height / 2 + Math.sin(angle) * r}`;
			}).join(' ');
			return `<polygon points="${points}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`;
		}
		case 'line':
			return `<line x1="0" y1="0" x2="${element.width}" y2="${element.height}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`;
		case 'rectangle':
		default:
			return `<rect width="${element.width}" height="${element.height}" rx="${Math.max(0, element.radius ?? 0)}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`;
	}
}

function renderText(element: Element, pathData?: string): string {
	if (pathData !== undefined) return pathData ? `<path d="${escapeXml(pathData)}" fill="${escapeXml(element.fill ?? '#203b32')}"/>` : '';
	const x = element.align === 'left' ? 0 : element.align === 'right' ? element.width : element.width / 2;
	const lines = (element.text ?? '').split('\n').map((line, index) => (
		`<tspan x="${x}"${index ? ` dy="${element.lineHeight ?? 1.16}em"` : ''}>${escapeXml(line)}</tspan>`
	)).join('');
	return `<text x="${x}" y="${element.height / 2}" fill="${escapeXml(element.fill ?? '#203b32')}" font-family="${escapeXml(element.fontFamily ?? 'Inter')}" font-size="${Math.max(1, element.fontSize ?? 48)}" font-weight="${Math.max(100, element.fontWeight ?? 400)}" letter-spacing="${element.letterSpacing ?? 0}" text-anchor="${element.align === 'left' ? 'start' : element.align === 'right' ? 'end' : 'middle'}" dominant-baseline="middle">${lines}</text>`;
}

function renderElement(element: Element, outlines: Map<string, string>, icons: Record<string, import('../library/icons').LucideNode[]>, warnings: string[]): string {
	if (!element.visible) return '';

	let content = '';
	if (element.type === 'text') {
		content = renderText(element, outlines.get(element.id));
	} else if (element.type === 'shape') {
		content = renderShape(element);
	} else if (element.type === 'group') {
		content = (element.children ?? []).map((child) => renderElement(child, outlines, icons, warnings)).join('');
	} else if (element.type === 'image' && element.src?.startsWith('data:image/')) {
		content = `<image href="${escapeXml(element.src)}" width="${element.width}" height="${element.height}"/>`;
	} else if (element.type === 'icon' && element.iconName && icons[element.iconName]) {
		content = `<svg width="${element.width}" height="${element.height}" viewBox="0 0 24 24" fill="${escapeXml(element.fill ?? 'none')}" stroke="${escapeXml(element.stroke ?? '#203b32')}" stroke-width="${Math.max(0, element.strokeWidth ?? 2)}" stroke-linecap="round" stroke-linejoin="round" preserveAspectRatio="xMidYMid meet">${renderLucideNodesToSvg(icons[element.iconName])}</svg>`;
	} else if (element.type === 'icon') {
		warnings.push(`Skipped unavailable Lucide icon “${escapeXml(element.iconName ?? 'unknown')}”.`);
		return '';
	} else {
		warnings.push(`Skipped unsupported ${element.type} element in SVG export.`);
		return '';
	}

	return `<g transform="translate(${element.x} ${element.y}) rotate(${element.rotation} ${element.width / 2} ${element.height / 2})" opacity="${Math.min(1, Math.max(0, element.opacity))}">${content}</g>`;
}

export async function exportProjectToSvg(
	project: LogoProject,
	options: SvgExportOptions = {},
): Promise<SvgExportResult> {
	const warnings: string[] = [];
	const outlines = new Map<string, string>();
	let icons: Record<string, import('../library/icons').LucideNode[]> = {};
	const iconElements = (elements: Element[]): boolean => elements.some((element) => element.type === 'icon' || Boolean(element.children && iconElements(element.children)));
	const projectElements = Object.values(project.variants).flat();
	if (iconElements(projectElements)) {
		const library = await loadLucideLibrary();
		icons = library.icons;
	}
	if (options.outlineText !== false) {
		const result = await outlineProjectText(project);
		for (const [id, outline] of result.outlines) outlines.set(id, outline.pathData);
		warnings.push(...result.warnings);
	}

	const background = options.background ?? project.artboard.background;
	const backgroundMarkup = background === 'transparent'
		? ''
		: `<rect width="${project.artboard.width}" height="${project.artboard.height}" fill="${escapeXml(background)}"/>`;
	const artwork = projectElements
		.map((element) => renderElement(element, outlines, icons, warnings))
		.join('');
	const svg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${project.artboard.width}" height="${project.artboard.height}" viewBox="0 0 ${project.artboard.width} ${project.artboard.height}"><title>${escapeXml(project.name)}</title>${backgroundMarkup}${artwork}</svg>`;
	return { svg, warnings };
}
