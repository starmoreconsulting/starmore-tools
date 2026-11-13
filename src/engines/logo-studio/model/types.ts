export type ElementType = 'text' | 'shape' | 'icon' | 'image' | 'group';

export interface Element {
	id: string;
	type: ElementType;
	name?: string;
	x: number;
	y: number;
	width: number;
	height: number;
	rotation: number;
	opacity: number;
	locked: boolean;
	visible: boolean;
	fill?: string;
	stroke?: string;
	strokeWidth?: number;
	text?: string;
	fontFamily?: string;
	fontSize?: number;
	fontWeight?: number;
	letterSpacing?: number;
	lineHeight?: number;
	align?: 'left' | 'center' | 'right';
	curve?: number;
	shape?: string;
	sides?: number;
	points?: number;
	iconName?: string;
	radius?: number;
	children?: Element[];
	src?: string;
	pathData?: string | number[][];
	gradient?: GradientFill;
	shadow?: ShadowEffect;
}

export interface LogoProject {
	version: 1;
	id: string;
	name: string;
	updatedAt: number;
	artboard: { width: number; height: number; background: string };
	variants: Record<string, Element[]>;
}

export interface GradientStop {
	offset: number;
	color: string;
}

export interface GradientFill {
	type: 'linear' | 'radial';
	angle: number;
	stops: GradientStop[];
}

export interface ShadowEffect {
	offsetX: number;
	offsetY: number;
	blur: number;
	color: string;
}

export function getElementGradientId(element: Pick<Element, 'id'>): string {
	return `logo-gradient-${element.id.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
}

export function getElementShadowId(element: Pick<Element, 'id'>): string {
	return `logo-shadow-${element.id.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
}

function createId(): string {
	return globalThis.crypto?.randomUUID?.() ?? `logo-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createDefaultElement(type: ElementType, overrides: Partial<Element> = {}): Element {
	const defaults: Element = {
		id: createId(),
		type,
		name: type === 'text' ? 'Text' : type === 'shape' ? 'Shape' : type === 'icon' ? 'Icon' : type === 'group' ? 'Group' : 'Image',
		x: 180,
		y: 180,
		width: 240,
		height: 64,
		rotation: 0,
		opacity: 1,
		locked: false,
		visible: true,
	};

	if (type === 'text') {
		Object.assign(defaults, {
			text: 'Your text',
			fontFamily: 'Inter',
			fontSize: 48,
			fontWeight: 600,
			letterSpacing: 0,
			align: 'center',
			fill: '#203b32',
		});
	} else if (type === 'shape') {
		Object.assign(defaults, { shape: 'rectangle', fill: '#d7ed79' });
	} else if (type === 'group') {
		defaults.children = [];
	} else if (type === 'icon') {
		defaults.iconName = 'sparkles';
		defaults.fill = 'none';
		defaults.stroke = '#203b32';
		defaults.strokeWidth = 2;
	} else if (type === 'image') {
		defaults.src = '';
	}

	return { ...defaults, ...overrides, id: overrides.id ?? defaults.id };
}

export function createDefaultProject(name = 'Untitled logo'): LogoProject {
	return {
		version: 1,
		id: createId(),
		name,
		updatedAt: Date.now(),
		artboard: { width: 600, height: 600, background: '#ffffff' },
		variants: { primary: [] },
	};
}
