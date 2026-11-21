import { describe, expect, it } from 'vitest';
import { restoreOldPhotoPixels } from './old-photo';

describe('restoreOldPhotoPixels', () => {
	it('returns a valid RGBA image of the same size', () => {
		const input = new Uint8ClampedArray([100, 120, 140, 255, 20, 40, 60, 255]);
		const output = restoreOldPhotoPixels(input, 2, 1, { fade: 10, contrast: 10, warmth: 0, denoise: 0, grain: 0, seed: 1 });
		expect(output.length).toBe(input.length);
		expect([...output].every((value) => value >= 0 && value <= 255)).toBe(true);
		expect(output[3]).toBe(255);
	});

	it('applies deterministic grain', () => {
		const input = new Uint8ClampedArray([128, 128, 128, 255, 128, 128, 128, 255]);
		const one = restoreOldPhotoPixels(input, 2, 1, { fade: 0, contrast: 0, warmth: 0, denoise: 0, grain: 12, seed: 42 });
		const two = restoreOldPhotoPixels(input, 2, 1, { fade: 0, contrast: 0, warmth: 0, denoise: 0, grain: 12, seed: 42 });
		expect(one).toEqual(two);
	});

	it('applies denoise without changing image dimensions', () => {
		const input = new Uint8ClampedArray(3 * 3 * 4).fill(100);
		const output = restoreOldPhotoPixels(input, 3, 3, { fade: 0, contrast: 0, warmth: 0, denoise: 50, grain: 0, seed: 1 });
		expect(output.length).toBe(input.length);
	});
});
