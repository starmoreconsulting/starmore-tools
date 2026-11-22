import { describe, expect, it } from 'vitest';
import {
	detectDocumentCorners,
	enhanceScannedImage,
	rectifyDocumentImage,
	validateScanCorners,
	type ScanImage,
	type ScanCorners,
} from './document-scanner';

function createImage(width: number, height: number, fill: (x: number, y: number) => [number, number, number]): ScanImage {
	const data = new Uint8ClampedArray(width * height * 4);
	for (let y = 0; y < height; y += 1) {
		for (let x = 0; x < width; x += 1) {
			const [red, green, blue] = fill(x, y);
			const index = (y * width + x) * 4;
			data[index] = red;
			data[index + 1] = green;
			data[index + 2] = blue;
			data[index + 3] = 255;
		}
	}
	return { width, height, data };
}

describe('document scanner engine', () => {
	it('detects the corners of a contrasting page quadrilateral', () => {
		const image = createImage(120, 100, (x, y) => (
			x >= 20 && x <= 100 && y >= 12 && y <= 88 ? [245, 245, 245] : [25, 25, 25]
		));
		const corners = detectDocumentCorners(image);
		expect(corners[0].x).toBeLessThan(30);
		expect(corners[0].y).toBeLessThan(20);
		expect(corners[1].x).toBeGreaterThan(90);
		expect(corners[2].x).toBeGreaterThan(90);
		expect(corners[2].y).toBeGreaterThan(80);
		expect(corners[3].x).toBeLessThan(30);
		expect(corners[3].y).toBeGreaterThan(80);
	});

	it('rectifies a quadrilateral into a clean rectangular raster', () => {
		const source = createImage(12, 12, (x, y) => [x * 10, y * 10, 0]);
		const corners: ScanCorners = [
			{ x: 2, y: 1 }, { x: 9, y: 2 }, { x: 10, y: 10 }, { x: 1, y: 9 },
		];
		const output = rectifyDocumentImage(source, corners);
		expect(output.width).toBeGreaterThan(2);
		expect(output.height).toBeGreaterThan(2);
		expect(output.data.length).toBe(output.width * output.height * 4);
		expect(output.data[3]).toBe(255);
	});

	it('validates corner ordering and selected area', () => {
		expect(() => validateScanCorners([
			{ x: 1, y: 1 }, { x: 8, y: 1 }, { x: 8, y: 8 }, { x: 1, y: 8 },
		], 10, 10)).not.toThrow();
		expect(() => validateScanCorners([
			{ x: 1, y: 1 }, { x: 8, y: 8 }, { x: 8, y: 1 }, { x: 1, y: 8 },
		], 10, 10)).toThrow('clockwise quadrilateral');
	});

	it('enhances scans as color, grayscale, or high-contrast black and white', () => {
		const source = createImage(2, 1, (x) => x === 0 ? [20, 40, 60] : [220, 220, 220]);
		expect(enhanceScannedImage(source, 'color').data).toEqual(source.data);
		const grayscale = enhanceScannedImage(source, 'grayscale');
		expect(grayscale.data[0]).toBe(grayscale.data[1]);
		expect(grayscale.data[1]).toBe(grayscale.data[2]);
		const blackWhite = enhanceScannedImage(source, 'black-white');
		expect(blackWhite.data[0]).toBe(0);
		expect(blackWhite.data[4]).toBe(255);
	});

	it('reports failure when no clear document edges can be found', () => {
		expect(() => detectDocumentCorners(createImage(20, 20, () => [100, 100, 100])))
			.toThrow('Could not detect document edges');
	});
});
