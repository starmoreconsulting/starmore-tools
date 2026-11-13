import type { Element } from '../model/types';

export type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se';

export function movedElement(element: Element, dx: number, dy: number): Partial<Element> {
	return { x: element.x + dx, y: element.y + dy };
}

export function resizedElement(
	element: Element,
	handle: ResizeHandle,
	dx: number,
	dy: number,
): Partial<Element> {
	const fromWest = handle.endsWith('w');
	const fromNorth = handle.startsWith('n');
	const rawWidth = element.width + (fromWest ? -dx : dx);
	const rawHeight = element.height + (fromNorth ? -dy : dy);
	const width = Math.max(12, rawWidth);
	const height = Math.max(12, rawHeight);

	return {
		width,
		height,
		x: fromWest ? element.x + element.width - width : element.x,
		y: fromNorth ? element.y + element.height - height : element.y,
	};
}

export function rotationFromPointer(
	element: Element,
	startAngle: number,
	pointerX: number,
	pointerY: number,
): number {
	const centerX = element.x + element.width / 2;
	const centerY = element.y + element.height / 2;
	const currentAngle = Math.atan2(pointerY - centerY, pointerX - centerX) * 180 / Math.PI;
	return element.rotation + currentAngle - startAngle;
}

export function getElementBounds(element: Element) {
	return { x: element.x, y: element.y, width: element.width, height: element.height };
}
