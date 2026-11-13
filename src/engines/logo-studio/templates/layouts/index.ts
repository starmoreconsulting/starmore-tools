import type { Element } from '../../model/types';
import { iconElement, initials, shapeElement, textElement } from './helpers';
import type { LayoutInput, LogoLayout } from './types';

function stackedIconName(input: LayoutInput): Element[] {
	return [
		iconElement(input, 252, 92, 96),
		textElement(input, input.brief.businessName, { x: 54, y: 310, width: 492, height: 96 }, { size: 64 }),
		...(input.brief.tagline ? [textElement(input, input.brief.tagline, { x: 75, y: 416, width: 450, height: 48 }, { font: input.fontPair.secondary, size: 25, weight: 400 })] : []),
	];
}

function horizontalIconName(input: LayoutInput): Element[] {
	const iconOnRight = input.brief.arrangement === 'icon-right';
	const iconX = iconOnRight ? 430 : 74;
	const textX = iconOnRight ? 56 : 184;
	const textWidth = 360;
	return [
		iconElement(input, iconX, 220, 96),
		textElement(input, input.brief.businessName, { x: textX, y: 232, width: textWidth, height: 82 }, { size: 50, maximum: 20 }),
		...(input.brief.tagline ? [textElement(input, input.brief.tagline, { x: textX, y: 320, width: textWidth, height: 44 }, { font: input.fontPair.secondary, size: 21, weight: 400, maximum: 30 })] : []),
	];
}

function textOnly(input: LayoutInput): Element[] {
	return [
		textElement(input, input.brief.businessName, { x: 45, y: input.brief.tagline ? 225 : 260, width: 510, height: 105 }, { size: 70, maximum: 20 }),
		...(input.brief.tagline ? [textElement(input, input.brief.tagline, { x: 65, y: 340, width: 470, height: 50 }, { font: input.fontPair.secondary, size: 26, weight: 400, spacing: 1, maximum: 32 })] : []),
	];
}

function monogramCircle(input: LayoutInput): Element[] {
	return [
		shapeElement('circle', 186, 72, 228, 228, 'none', input.palette.colors[0], 5),
		textElement(input, initials(input.brief.businessName), { x: 202, y: 145, width: 196, height: 84 }, { size: 82, weight: 700, role: 'icon', maximum: 4 }),
		textElement(input, input.brief.businessName, { x: 45, y: 350, width: 510, height: 77 }, { size: 48, maximum: 18 }),
	];
}

function monogramSquare(input: LayoutInput): Element[] {
	return [
		shapeElement('rounded-rectangle', 196, 74, 208, 208, input.palette.colors[0]),
		textElement(input, initials(input.brief.businessName), { x: 212, y: 128, width: 176, height: 102 }, { size: 78, fill: input.palette.colors[1], role: 'icon', maximum: 4 }),
		textElement(input, input.brief.businessName, { x: 48, y: 344, width: 504, height: 78 }, { size: 50, maximum: 18 }),
	];
}

function badgeEmblem(input: LayoutInput): Element[] {
	return [
		shapeElement('circle', 176, 76, 248, 248, 'none', input.palette.colors[0], 4),
		textElement(input, input.brief.businessName, { x: 186, y: 98, width: 228, height: 54 }, { size: 27, curve: -48, maximum: 16 }),
		iconElement(input, 258, 166, 84),
		textElement(input, input.brief.tagline || input.brief.industry, { x: 190, y: 256, width: 220, height: 45 }, { font: input.fontPair.secondary, size: 20, weight: 500, curve: 34, role: 'tagline', maximum: 18 }),
	];
}

function underlineWordmark(input: LayoutInput): Element[] {
	return [
		textElement(input, input.brief.businessName, { x: 42, y: 218, width: 516, height: 94 }, { size: 68, spacing: 1.8, maximum: 20 }),
		shapeElement('line', 145, 328, 310, 0, 'none', input.palette.colors[1], 5),
		...(input.brief.tagline ? [textElement(input, input.brief.tagline, { x: 76, y: 348, width: 448, height: 44 }, { font: input.fontPair.secondary, size: 23, weight: 400 })] : []),
	];
}

function twoLineWordmark(input: LayoutInput): Element[] {
	const name = input.brief.businessName.trim();
	const parts = name.split(/\s+/).filter(Boolean);
	const midpoint = Math.ceil(parts.length / 2);
	const lineOne = parts.length > 1 ? parts.slice(0, midpoint).join(' ') : name;
	const lineTwo = parts.length > 1 ? parts.slice(midpoint).join(' ') : '';
	return [
		textElement(input, lineOne, { x: 42, y: lineTwo ? 184 : 220, width: 516, height: 82 }, { size: 62, maximum: 22 }),
		...(lineTwo ? [textElement(input, lineTwo, { x: 42, y: 264, width: 516, height: 82 }, { size: 62, maximum: 22, fill: input.palette.colors[1] })] : []),
		...(input.brief.tagline ? [textElement(input, input.brief.tagline, { x: 65, y: lineTwo ? 365 : 320, width: 470, height: 48 }, { font: input.fontPair.secondary, size: 23, weight: 400 })] : []),
	];
}

function iconInShapeBesideName(input: LayoutInput): Element[] {
	const iconOnRight = input.brief.arrangement === 'icon-right';
	const shapeX = iconOnRight ? 425 : 62;
	const textX = iconOnRight ? 54 : 193;
	const iconColor = input.palette.colors[1];
	return [
		shapeElement('rounded-rectangle', shapeX, 212, 112, 112, input.palette.colors[0]),
		iconElement(input, shapeX + 14, 226, 84, iconColor),
		textElement(input, input.brief.businessName, { x: textX, y: 230, width: 350, height: 68 }, { size: 48, maximum: 18 }),
		...(input.brief.tagline ? [textElement(input, input.brief.tagline, { x: textX, y: 305, width: 350, height: 42 }, { font: input.fontPair.secondary, size: 20, weight: 400 })] : []),
	];
}

function initialAndName(input: LayoutInput): Element[] {
	const mark = initials(input.brief.businessName).slice(0, 1);
	return [
		textElement(input, mark, { x: 66, y: 208, width: 100, height: 110 }, { size: 100, weight: 700, fill: input.palette.colors[1], role: 'icon', maximum: 2 }),
		shapeElement('line', 177, 220, 0, 132, 'none', input.palette.colors[0], 3),
		textElement(input, input.brief.businessName, { x: 204, y: 228, width: 338, height: 76 }, { size: 48, align: 'left', maximum: 17 }),
		...(input.brief.tagline ? [textElement(input, input.brief.tagline, { x: 204, y: 310, width: 338, height: 44 }, { font: input.fontPair.secondary, size: 20, weight: 400, align: 'left' })] : []),
	];
}

export const logoLayouts: LogoLayout[] = [
	{ id: 'stacked-icon-name', name: 'Stacked icon + name', arrangements: ['icon-above-text'], build: stackedIconName },
	{ id: 'horizontal-icon-name', name: 'Horizontal icon + name', arrangements: ['icon-left', 'icon-right'], build: horizontalIconName },
	{ id: 'text-only', name: 'Text only', arrangements: ['text-only'], build: textOnly },
	{ id: 'monogram-circle', name: 'Monogram in a circle', arrangements: ['badge', 'icon-above-text'], build: monogramCircle },
	{ id: 'monogram-square', name: 'Monogram in a square', arrangements: ['badge', 'icon-above-text'], build: monogramSquare },
	{ id: 'badge-emblem', name: 'Badge / emblem', arrangements: ['badge'], build: badgeEmblem },
	{ id: 'underline-wordmark', name: 'Underline wordmark', arrangements: ['text-only', 'icon-above-text'], build: underlineWordmark },
	{ id: 'two-line-wordmark', name: 'Two-line stacked wordmark', arrangements: ['text-only', 'icon-above-text'], build: twoLineWordmark },
	{ id: 'icon-shape-name', name: 'Icon in a shape + name', arrangements: ['icon-left', 'icon-right'], build: iconInShapeBesideName },
	{ id: 'initial-name', name: 'Minimal initial + name', arrangements: ['icon-left', 'icon-right', 'text-only'], build: initialAndName },
];

export function buildLogoLayout(id: string, input: LayoutInput): Element[] {
	const layout = logoLayouts.find((candidate) => candidate.id === id);
	if (!layout) throw new Error(`Unknown logo layout: ${id}`);
	return layout.build(input);
}

export type { LayoutInput, LogoLayout } from './types';
