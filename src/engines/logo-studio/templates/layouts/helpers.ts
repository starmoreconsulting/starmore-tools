import { createDefaultElement, type Element } from '../../model/types';
import type { LayoutInput } from './types';

function graphemes(value: string): string[] {
	if (typeof Intl.Segmenter === 'function') {
		return Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(value), (part) => part.segment);
	}
	return Array.from(value);
}

function wrappedText(value: string, maximum: number): string {
	const clean = value.trim();
	const characters = graphemes(clean);
	if (characters.length <= maximum) return clean;
	const midpoint = Math.ceil(characters.length / 2);
	let splitIndex = midpoint;
	let nearestGap = Number.POSITIVE_INFINITY;
	for (let index = 1; index < characters.length; index += 1) {
		if (!/\s/.test(characters[index - 1])) continue;
		const distance = Math.abs(index - midpoint);
		if (distance < nearestGap) {
			nearestGap = distance;
			splitIndex = index;
		}
	}
	return `${characters.slice(0, splitIndex).join('').trim()}\n${characters.slice(splitIndex).join('').trim()}`;
}

export interface TextFitResult {
	text: string;
	fontSize: number;
	overflow: boolean;
}

export function fitTextToBox(
	value: string,
	box: { width: number; height: number },
	fontSize: number,
	letterSpacing = 0,
	options: { minimumFontSize?: number; maxCharacters?: number } = {},
): TextFitResult {
	if (!value) return { text: value, fontSize, overflow: false };
	const minimum = Math.max(0.5, options.minimumFontSize ?? 8);
	let text: string;
	if (options.maxCharacters) {
		text = wrappedText(value, options.maxCharacters);
	} else {
		const maximum = Math.max(1, Math.floor(box.width / Math.max(1, fontSize * 0.58 + letterSpacing)));
		text = value.split('\n').flatMap((line) => {
			const words = line.split(/\s+/).filter(Boolean);
			const lines: string[] = [];
			let current = '';
			for (const word of words) {
				if (graphemes(word).length > maximum) {
					if (current) lines.push(current);
					current = '';
					const characters = graphemes(word);
					for (let index = 0; index < characters.length; index += maximum) {
						const chunk = characters.slice(index, index + maximum).join('');
						if (index + maximum < characters.length) lines.push(chunk);
						else current = chunk;
					}
				} else if (!current) current = word;
				else if (graphemes(`${current} ${word}`).length <= maximum) current += ` ${word}`;
				else {
					lines.push(current);
					current = word;
				}
			}
			if (current || lines.length === 0) lines.push(current);
			return lines;
		}).join('\n');
	}
	const lines = text.split('\n');
	const longestLine = Math.max(1, ...lines.map((line) => graphemes(line).length));
	const spacing = Math.min(letterSpacing, box.width / Math.max(2, longestLine * 2));
	const widthFit = (box.width - Math.max(0, longestLine - 1) * spacing) / Math.max(3, longestLine * 0.9);
	const heightFit = box.height / (Math.max(1, lines.length) * 1.25);
	const fitted = Math.min(fontSize, widthFit, heightFit);
	return {
		text,
		fontSize: Math.max(minimum, fitted),
		overflow: fitted < minimum || lines.length > 2,
	};
}

export function textElement(
	input: LayoutInput,
	text: string,
	box: { x: number; y: number; width: number; height: number },
	options: { font?: string; size?: number; weight?: number; spacing?: number; fill?: string; curve?: number; align?: Element['align']; name?: string; role?: Element['role']; maximum?: number } = {},
): Element {
	const baseSize = options.size ?? 56;
	const fit = fitTextToBox(text, box, baseSize, options.spacing ?? 0, {
		maxCharacters: options.maximum ?? 18,
		minimumFontSize: 0.5,
	});
	const role = options.role ?? (text === input.brief.tagline && input.brief.tagline ? 'tagline' : 'name');
	const longestLine = Math.max(1, ...fit.text.split('\n').map((line) => graphemes(line).length));
	const spacing = Math.min(options.spacing ?? 0, box.width / Math.max(2, longestLine * 2));
	const element = createDefaultElement('text', {
		...box,
		name: options.name ?? (text === input.brief.tagline && input.brief.tagline ? 'Tagline' : 'Business name'),
		role,
		...(role === 'name' || role === 'tagline' ? { fieldName: role } : {}),
		text: fit.text,
		fontFamily: options.font ?? input.fontPair.primary,
		fontSize: Math.min(fit.fontSize, box.height / (Math.max(1, fit.text.split('\n').length) * 1.25)),
		fontWeight: options.weight ?? 700,
		letterSpacing: spacing,
		lineHeight: 1.08,
		align: options.align ?? 'center',
		fill: options.fill ?? input.palette.colors[0],
	});
	if (options.curve !== undefined) element.curve = options.curve;
	return element;
}

export function iconElement(input: LayoutInput, x: number, y: number, size: number, color = input.palette.colors[0]): Element {
	return createDefaultElement('icon', {
		x, y, width: size, height: size, name: `${input.icon} icon`,
		role: 'icon',
		iconName: input.icon, stroke: color, fill: 'none', strokeWidth: 2,
	});
}

export function shapeElement(
	shape: string,
	x: number,
	y: number,
	width: number,
	height: number,
	fill: string,
	stroke = 'none',
	strokeWidth = 0,
): Element {
	return createDefaultElement('shape', {
		shape, x, y, width, height, fill, stroke, strokeWidth, role: 'decor', radius: shape === 'rounded-rectangle' ? 18 : 0,
	});
}

export function initials(value: string): string {
	const parts = value.trim().split(/\s+/).filter(Boolean);
	const selected = parts.length > 1 ? parts.slice(0, 2) : [value.trim()];
	return selected.map((part) => graphemes(part)[0] ?? '').join('').toLocaleUpperCase().slice(0, 3) || '?';
}
