export type GradientType = 'linear' | 'radial' | 'conic';
export interface GradientStop { id: string; color: string; position: number }

export function sortGradientStops(stops: GradientStop[]): GradientStop[] {
	return [...stops].sort((a, b) => a.position - b.position);
}

export function gradientStopsToCss(stops: GradientStop[]): string {
	const ordered = sortGradientStops(stops);
	return ordered.map((stop) => `${stop.color} ${stop.position}%`).join(', ');
}

export function buildGradientCss(
	type: GradientType,
	stops: GradientStop[],
	options: { angle?: number; radialShape?: 'circle' | 'ellipse'; radialSize?: 'closest-side' | 'farthest-side' | 'closest-corner' | 'farthest-corner'; radialPosition?: string; repeating?: boolean } = {},
): string {
	if (!stops.length) throw new Error('Add at least one gradient stop.');
	if (stops.length > 12) throw new Error('A maximum of 12 gradient stops is supported.');
	for (const stop of stops) {
		if (!/^#[0-9a-f]{6}$/i.test(stop.color)) throw new Error('Every gradient stop needs a valid 6-digit hex colour.');
		if (!Number.isFinite(stop.position) || stop.position < 0 || stop.position > 100) {
			throw new Error('Gradient stop positions must be between 0% and 100%.');
		}
	}

	const stopText = gradientStopsToCss(stops);
	const repeating = options.repeating ? 'repeating-' : '';
	if (type === 'linear') {
		const angle = Number.isFinite(options.angle) ? Math.max(-360, Math.min(360, options.angle ?? 90)) : 90;
		return `${repeating}linear-gradient(${angle}deg, ${stopText})`;
	}
	if (type === 'radial') {
		const shape = options.radialShape ?? 'ellipse';
		const size = options.radialSize ?? 'farthest-corner';
		const position = options.radialPosition?.trim() || 'center';
		return `${repeating}radial-gradient(${shape} ${size} at ${position}, ${stopText})`;
	}
	const angle = Number.isFinite(options.angle) ? Math.max(-360, Math.min(360, options.angle ?? 0)) : 0;
	return `${repeating}conic-gradient(from ${angle}deg at center, ${stopText})`;
}
