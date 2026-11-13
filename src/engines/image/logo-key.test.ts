import { describe, expect, it } from 'vitest';
import { applyColorKey, type ColorKeyOptions } from './logo-key';

const key: ColorKeyOptions = {
	key: [0, 0, 0],
	tolerance: 0,
	softEdge: 0,
	connectedOnly: false,
	cleanupNoise: false,
};

function pixels(...colors: [number, number, number, number][]): Uint8ClampedArray {
	return new Uint8ClampedArray(colors.flat());
}

describe('applyColorKey', () => {
	it('removes exact colour matches and keeps other colours', () => {
		const input = pixels([0, 0, 0, 255], [2, 0, 0, 255]);
		const result = applyColorKey(input, 2, 1, key);

		expect(result[3]).toBe(0);
		expect(result[7]).toBe(255);
	});

	it('applies tolerance and a gradual soft edge at the configured boundaries', () => {
		const input = pixels([9, 0, 0, 255], [10, 0, 0, 255], [15, 0, 0, 255], [20, 0, 0, 255]);
		const result = applyColorKey(input, 4, 1, { ...key, tolerance: 10, softEdge: 10 });

		expect(result[3]).toBe(0);
		expect(result[7]).toBe(0);
		expect(result[11]).toBeGreaterThan(0);
		expect(result[11]).toBeLessThan(255);
		expect(result[15]).toBe(255);
	});

	it('limits removal to the picked flood-fill area when connected-only is selected', () => {
		const input = pixels([0, 0, 0, 255], [255, 0, 0, 255], [0, 0, 0, 255]);
		const result = applyColorKey(input, 3, 1, {
			...key,
			connectedOnly: true,
			seed: { x: 0, y: 0 },
		});

		expect(result[3]).toBe(0);
		expect(result[11]).toBe(255);
	});

	it('removes every matching region when all-matching mode is selected', () => {
		const input = pixels([0, 0, 0, 255], [255, 0, 0, 255], [0, 0, 0, 255]);
		const result = applyColorKey(input, 3, 1, key);

		expect(result[3]).toBe(0);
		expect(result[11]).toBe(0);
	});

	it('leaves an image unchanged when no pixel matches', () => {
		const input = pixels([20, 30, 40, 255], [50, 60, 70, 255]);
		const result = applyColorKey(input, 2, 1, key);

		expect(result).toEqual(input);
	});

	it('makes a fully matching image transparent', () => {
		const input = pixels([0, 0, 0, 255], [0, 0, 0, 128]);
		const result = applyColorKey(input, 2, 1, key);

		expect(result[3]).toBe(0);
		expect(result[7]).toBe(0);
	});

	it('clamps un-premultiplied edge channels to the valid byte range', () => {
		const input = pixels([200, 200, 200, 255]);
		const result = applyColorKey(input, 1, 1, {
			...key,
			key: [255, 255, 255],
			softEdge: 100,
		});

		expect([...result].every((value) => value >= 0 && value <= 255)).toBe(true);
		expect(result[3]).toBeGreaterThan(0);
		expect(result[3]).toBeLessThan(255);
	});
});
