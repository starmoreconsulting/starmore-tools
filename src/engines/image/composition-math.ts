export interface NormalizedPoint {
	x: number;
	y: number;
}

export interface SourceCrop {
	x: number;
	y: number;
	width: number;
	height: number;
}

export function coverSourceCrop(
	sourceWidth: number,
	sourceHeight: number,
	targetAspect: number,
	zoom = 1,
	center: NormalizedPoint = { x: 0.5, y: 0.5 },
): SourceCrop {
	if (![sourceWidth, sourceHeight, targetAspect, zoom, center.x, center.y].every(Number.isFinite)
		|| sourceWidth < 1 || sourceHeight < 1 || targetAspect <= 0 || zoom < 1) {
		throw new Error('The image crop settings are invalid.');
	}
	const sourceAspect = sourceWidth / sourceHeight;
	let width = sourceWidth;
	let height = sourceHeight;
	if (sourceAspect > targetAspect) width = sourceHeight * targetAspect;
	else height = sourceWidth / targetAspect;
	width /= zoom;
	height /= zoom;
	return {
		x: Math.max(0, Math.min(sourceWidth - width, center.x * sourceWidth - width / 2)),
		y: Math.max(0, Math.min(sourceHeight - height, center.y * sourceHeight - height / 2)),
		width,
		height,
	};
}
