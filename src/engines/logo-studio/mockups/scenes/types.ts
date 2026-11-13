export type MockupCategory =
	| 'Business cards'
	| 'Stationery'
	| 'Signage'
	| 'Packaging'
	| 'Apparel'
	| 'Retail'
	| 'Drinkware'
	| 'Social'
	| 'Digital';

export type SceneColorParameter = 'paper' | 'fabric' | 'wall' | 'product' | 'surface' | 'accent';

export interface MockupColor {
	name: string;
	value: string;
}

export interface MockupClip {
	shape: 'rect' | 'circle' | 'ellipse';
	x?: number;
	y?: number;
	width?: number;
	height?: number;
	radius?: number;
}

export interface MockupSlot {
	id: string;
	x: number;
	y: number;
	width: number;
	height: number;
	padding: number;
	rotation: number;
	skewX?: number;
	skewY?: number;
	clip?: MockupClip;
	opacity: number;
	blendMode?: 'normal' | 'multiply' | 'screen' | 'overlay';
	preferredVariant: string;
	surfaceParameter: SceneColorParameter;
}

export interface MockupScene {
	id: string;
	name: string;
	category: MockupCategory;
	description: string;
	viewBox: string;
	background: string;
	colors: Record<SceneColorParameter, MockupColor>;
	slots: MockupSlot[];
}
