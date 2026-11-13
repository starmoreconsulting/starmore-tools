import type { Element } from '../model/types';

export type ShapeGeometry =
	| { tag: 'rect'; x: number; y: number; width: number; height: number; rx: number }
	| { tag: 'ellipse'; cx: number; cy: number; rx: number; ry: number }
	| { tag: 'line'; x1: number; y1: number; x2: number; y2: number }
	| { tag: 'polygon'; points: string }
	| { tag: 'path'; d: string; fillRule?: 'evenodd' };

function safeDimension(value: number): number {
	return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function polygonPoints(width: number, height: number, count: number, innerRatio = 1): string {
	const centerX = width / 2;
	const centerY = height / 2;
	const radiusX = width / 2;
	const radiusY = height / 2;
	return Array.from({ length: count }, (_, index) => {
		const radius = index % 2 === 0 ? 1 : innerRatio;
		const angle = -Math.PI / 2 + index * Math.PI * 2 / count;
		return `${centerX + Math.cos(angle) * radiusX * radius},${centerY + Math.sin(angle) * radiusY * radius}`;
	}).join(' ');
}

export function getShapeGeometry(element: Element): ShapeGeometry {
	const width = safeDimension(element.width);
	const height = safeDimension(element.height);
	const cx = width / 2;
	const cy = height / 2;

	switch (element.shape) {
		case 'circle':
			return { tag: 'ellipse', cx, cy, rx: cx, ry: cy };
		case 'triangle':
			return { tag: 'polygon', points: `${cx},0 ${width},${height} 0,${height}` };
		case 'polygon': {
			const sides = Math.min(12, Math.max(3, Math.round(element.sides ?? 6)));
			return { tag: 'polygon', points: polygonPoints(width, height, sides) };
		}
		case 'star': {
			const points = Math.min(12, Math.max(3, Math.round(element.points ?? 5)));
			return { tag: 'polygon', points: polygonPoints(width, height, points * 2, 0.44) };
		}
		case 'arrow':
			return { tag: 'polygon', points: `${width * 0.58},0 ${width},${cy} ${width * 0.58},${height} ${width * 0.58},${height * 0.68} 0,${height * 0.68} 0,${height * 0.32} ${width * 0.58},${height * 0.32}` };
		case 'line':
			return { tag: 'line', x1: 0, y1: 0, x2: width, y2: height };
		case 'ring': {
			const outerX = cx;
			const outerY = cy;
			const innerX = cx * 0.52;
			const innerY = cy * 0.52;
			return {
				tag: 'path',
				fillRule: 'evenodd',
				d: `M ${cx} 0 A ${outerX} ${outerY} 0 1 1 ${cx} ${height} A ${outerX} ${outerY} 0 1 1 ${cx} 0 Z M ${cx} ${cy - innerY} A ${innerX} ${innerY} 0 1 0 ${cx} ${cy + innerY} A ${innerX} ${innerY} 0 1 0 ${cx} ${cy - innerY} Z`,
			};
		}
		case 'hexagon':
			return { tag: 'polygon', points: polygonPoints(width, height, 6) };
		case 'diamond':
			return { tag: 'polygon', points: `${cx},0 ${width},${cy} ${cx},${height} 0,${cy}` };
		case 'shield':
			return { tag: 'path', d: `M ${cx} 0 L ${width} ${height * 0.16} L ${width * 0.92} ${height * 0.62} Q ${width * 0.84} ${height * 0.86} ${cx} ${height} Q ${width * 0.16} ${height * 0.86} ${width * 0.08} ${height * 0.62} L 0 ${height * 0.16} Z` };
		case 'leaf':
			return { tag: 'path', d: `M ${width * 0.08} ${height * 0.88} Q ${width * 0.1} ${height * 0.12} ${width * 0.92} ${height * 0.08} Q ${width * 0.88} ${height * 0.9} ${width * 0.08} ${height * 0.88} Z` };
		case 'drop':
			return { tag: 'path', d: `M ${cx} 0 C ${width * 0.34} ${height * 0.27} ${width * 0.06} ${height * 0.57} ${width * 0.06} ${height * 0.72} A ${width * 0.44} ${height * 0.3} 0 0 0 ${width * 0.94} ${height * 0.72} C ${width * 0.94} ${height * 0.57} ${width * 0.66} ${height * 0.27} ${cx} 0 Z` };
		case 'bolt':
			return { tag: 'polygon', points: `${width * 0.58},0 ${width * 0.18},${height * 0.56} ${width * 0.46},${height * 0.56} ${width * 0.34},${height} ${width * 0.82},${height * 0.38} ${width * 0.54},${height * 0.38}` };
		case 'rounded-rectangle':
		case 'rectangle':
		default:
			return {
				tag: 'rect',
				x: 0,
				y: 0,
				width,
				height,
				rx: Math.min(width / 2, height / 2, safeDimension(element.radius ?? (element.shape === 'rounded-rectangle' ? 16 : 0))),
			};
	}
}
