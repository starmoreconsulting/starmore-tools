import { describe, expect, it } from 'vitest';
import { fillMask, hasMaskedPixels, inpaintMaskedPixels } from './patch-mask';

describe('patch mask helpers', () => {
	it('marks pixels along a stroke', () => {
		const mask = new Uint8ClampedArray(10 * 10);
		const filled = fillMask(mask, 10, 10, 2, 5, 7, 5, 2);
		expect(hasMaskedPixels(filled)).toBe(true);
		expect(filled[5 * 10 + 2]).toBe(255);
		expect(filled[5 * 10 + 7]).toBe(255);
	});

	it('fills masked pixels from surrounding colours', () => {
		const pixels = new Uint8ClampedArray([
			255,0,0,255, 0,255,0,255,
			0,0,255,255, 255,255,255,255,
	]);
		const mask = new Uint8ClampedArray([0,0,255,0]);
		const result = inpaintMaskedPixels(pixels, mask, 2, 2, 2);
		expect(result.length).toBe(pixels.length);
		expect(result[8 + 1]).toBeGreaterThanOrEqual(0);
	});

	it('reports no masked pixels for an empty mask', () => {
		expect(hasMaskedPixels(new Uint8ClampedArray(20))).toBe(false);
	});
});
