import { describe, expect, it } from 'vitest';
import { buildGradientCss, gradientStopsToCss, sortGradientStops } from './css-gradient';

const stops = [
	{ id: 'end', color: '#8b5cf6', position: 100 },
	{ id: 'start', color: '#22d3ee', position: 0 },
	{ id: 'middle', color: '#3b82f6', position: 50 },
];

describe('CSS gradient engine', () => {
	it('sorts stops and builds linear gradients', () => {
		expect(sortGradientStops(stops).map((stop) => stop.id)).toEqual(['start', 'middle', 'end']);
		expect(gradientStopsToCss(stops)).toBe('#22d3ee 0%, #3b82f6 50%, #8b5cf6 100%');
		expect(buildGradientCss('linear', stops, { angle: 135 })).toBe('linear-gradient(135deg, #22d3ee 0%, #3b82f6 50%, #8b5cf6 100%)');
	});

	it('builds radial and repeating conic gradients', () => {
		expect(buildGradientCss('radial', stops, { radialShape: 'circle', radialSize: 'closest-side', radialPosition: 'top left' })).toBe('radial-gradient(circle closest-side at top left, #22d3ee 0%, #3b82f6 50%, #8b5cf6 100%)');
		expect(buildGradientCss('conic', stops, { angle: 45, repeating: true })).toBe('repeating-conic-gradient(from 45deg at center, #22d3ee 0%, #3b82f6 50%, #8b5cf6 100%)');
	});

	it('validates stop count, colours, positions, and type options', () => {
		expect(() => buildGradientCss('linear', [])).toThrow('at least one');
		expect(() => buildGradientCss('linear', [...Array(13)].map((_, index) => ({ id: String(index), color: '#000000', position: index }))))
			.toThrow('maximum of 12');
		expect(() => buildGradientCss('linear', [{ id: 'bad', color: 'red', position: 10 }])).toThrow('valid 6-digit');
		expect(() => buildGradientCss('linear', [{ id: 'bad', color: '#000000', position: 101 }])).toThrow('between 0% and 100%');
	});
});
