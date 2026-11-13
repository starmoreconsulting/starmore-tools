import { getElementGradientId, getElementShadowId, type Element, type LogoProject } from '../model/types';
import { outlineProjectText } from './outline';
import type { TextOutline } from './outline';
import { loadLucideLibrary, renderLucideNodesToSvg } from '../library/icons';
import { getShapeGeometry } from '../library/shapes';

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

function getPaint(element: Element): string {
	return element.gradient ? `url(#${getElementGradientId(element)})` : escapeXml(element.fill ?? '#d7ed79');
}

function renderShape(element: Element): string {
	const fill = element.shape === 'line' ? 'none' : getPaint(element);
	const stroke = element.gradient && element.stroke ? getPaint(element) : escapeXml(element.stroke ?? (element.shape === 'line' ? '#203b32' : 'none'));
	const strokeWidth = Math.max(0, element.strokeWidth ?? 2);
	const geometry = getShapeGeometry(element);
	const common = `fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linejoin="round"`;
	switch (geometry.tag) {
		case 'rect': return `<rect x="${geometry.x}" y="${geometry.y}" width="${geometry.width}" height="${geometry.height}" rx="${geometry.rx}" ${common}/>`;
		case 'ellipse': return `<ellipse cx="${geometry.cx}" cy="${geometry.cy}" rx="${geometry.rx}" ry="${geometry.ry}" ${common}/>`;
		case 'line': return `<line x1="${geometry.x1}" y1="${geometry.y1}" x2="${geometry.x2}" y2="${geometry.y2}" ${common}/>`;
		case 'polygon': return `<polygon points="${geometry.points}" ${common}/>`;
		case 'path': return `<path d="${geometry.d}"${geometry.fillRule ? ` fill-rule="${geometry.fillRule}"` : ''} ${common}/>`;
	}
}

function renderText(element: Element, outline?: TextOutline): string {
	const fill = element.gradient ? `url(#${getElementGradientId(element)})` : escapeXml(element.fill ?? '#203b32');
	if (outline) return `<g fill="${fill}">${outline.markup}</g>`;
	const x = element.align === 'left' ? 0 : element.align === 'right' ? element.width : element.width / 2;
	const lines = (element.text ?? '').split('\n').map((line, index) => (
		`<tspan x="${x}"${index ? ` dy="${element.lineHeight ?? 1.16}em"` : ''}>${escapeXml(line)}</tspan>`
	)).join('');
	return `<text x="${x}" y="${element.height / 2}" fill="${fill}" font-family="${escapeXml(element.fontFamily ?? 'Inter')}" font-size="${Math.max(1, element.fontSize ?? 48)}" font-weight="${Math.max(100, element.fontWeight ?? 400)}" letter-spacing="${element.letterSpacing ?? 0}" text-anchor="${element.align === 'left' ? 'start' : element.align === 'right' ? 'end' : 'middle'}" dominant-baseline="middle">${lines}</text>`;
}

function renderGradient(element: Element): string {
	const gradient = element.gradient;
	if (!gradient) return '';
	const stops = gradient.stops.map((stop) => `<stop offset="${Math.min(1, Math.max(0, stop.offset)) * 100}%" stop-color="${escapeXml(stop.color)}"/>`).join('');
	const id = getElementGradientId(element);
	if (gradient.type === 'radial') return `<radialGradient id="${id}" cx="50%" cy="50%" r="50%">${stops}</radialGradient>`;
	const angle = gradient.angle * Math.PI / 180;
	const x = Math.cos(angle) * 50;
	const y = Math.sin(angle) * 50;
	return `<linearGradient id="${id}" x1="${50 - x}%" y1="${50 - y}%" x2="${50 + x}%" y2="${50 + y}%">${stops}</linearGradient>`;
}

function renderShadow(element: Element): string {
	if (!element.shadow) return '';
	const shadow = element.shadow;
	return `<filter id="${getElementShadowId(element)}" x="-50%" y="-50%" width="200%" height="200%" color-interpolation-filters="sRGB"><feDropShadow dx="${shadow.offsetX}" dy="${shadow.offsetY}" stdDeviation="${shadow.blur}" flood-color="${escapeXml(shadow.color)}"/></filter>`;
}

function collectEffectMarkup(elements: Element[]): string {
	return elements.map((element) => `${renderGradient(element)}${renderShadow(element)}${element.children ? collectEffectMarkup(element.children) : ''}`).join('');
}

function renderElement(element: Element, outlines: Map<string, TextOutline>, icons: Record<string, import('../library/icons').LucideNode[]>, warnings: string[]): string {
	if (!element.visible) return '';

	let content = '';
	if (element.type === 'text') {
		content = renderText(element, outlines.get(element.id));
	} else if (element.type === 'shape') {
		content = renderShape(element);
	} else if (element.type === 'path') {
		content = `<path d="${escapeXml(element.d ?? '')}" fill="${getPaint(element)}" stroke="${escapeXml(element.stroke ?? 'none')}" stroke-width="${Math.max(0, element.strokeWidth ?? 0)}" fill-rule="${element.fillRule ?? 'nonzero'}" stroke-linejoin="round"/>`;
	} else if (element.type === 'group') {
		content = (element.children ?? []).map((child) => renderElement(child, outlines, icons, warnings)).join('');
	} else if (element.type === 'image' && element.src?.startsWith('data:image/')) {
		content = `<image href="${escapeXml(element.src)}" width="${element.width}" height="${element.height}"/>`;
	} else if (element.type === 'icon' && element.iconName && icons[element.iconName]) {
		const fill = element.gradient ? `url(#${getElementGradientId(element)})` : escapeXml(element.fill ?? 'none');
		const stroke = element.gradient && element.stroke ? fill : escapeXml(element.stroke ?? '#203b32');
		content = `<svg width="${element.width}" height="${element.height}" viewBox="0 0 24 24" fill="${fill}" stroke="${stroke}" stroke-width="${Math.max(0, element.strokeWidth ?? 2)}" stroke-linecap="round" stroke-linejoin="round" preserveAspectRatio="xMidYMid meet">${renderLucideNodesToSvg(icons[element.iconName])}</svg>`;
	} else if (element.type === 'icon') {
		warnings.push(`Skipped unavailable Lucide icon “${escapeXml(element.iconName ?? 'unknown')}”.`);
		return '';
	} else {
		warnings.push(`Skipped unsupported ${element.type} element in SVG export.`);
		return '';
	}

	const filter = element.shadow ? ` filter="url(#${getElementShadowId(element)})"` : '';
	return `<g transform="translate(${element.x} ${element.y}) rotate(${element.rotation} ${element.width / 2} ${element.height / 2})" opacity="${Math.min(1, Math.max(0, element.opacity))}"${filter}>${content}</g>`;
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
	if (options.outlineText !== false || projectElements.some((element) => containsCurvedText(element))) {
		const result = await outlineProjectText(project, options.outlineText === false);
		for (const [id, outline] of result.outlines) outlines.set(id, outline);
		warnings.push(...result.warnings);
	}

	const background = options.background ?? project.artboard.background;
	const backgroundMarkup = background === 'transparent'
		? ''
		: `<rect width="${project.artboard.width}" height="${project.artboard.height}" fill="${escapeXml(background)}"/>`;
	const artwork = projectElements
		.map((element) => renderElement(element, outlines, icons, warnings))
		.join('');
	const gradientMarkup = `<defs>${collectEffectMarkup(projectElements)}</defs>`;
	const svg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${project.artboard.width}" height="${project.artboard.height}" viewBox="0 0 ${project.artboard.width} ${project.artboard.height}"><title>${escapeXml(project.name)}</title>${gradientMarkup}${backgroundMarkup}${artwork}</svg>`;
	return { svg, warnings };
}

function containsCurvedText(element: Element): boolean {
	return (element.type === 'text' && Boolean(element.curve))
		|| Boolean(element.children?.some(containsCurvedText));
}
