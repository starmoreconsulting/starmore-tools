import { describe, expect, it } from 'vitest';
import {
	choosePrintRasterScale,
	getPrintRasterLimits,
	PRINT_BATCH_ONE_MAX_PIXELS,
	PRINT_LOW_MEMORY_MAX_PIXELS,
} from './print-raster-scale';

const desktop = getPrintRasterLimits({ deviceMemory: 8, userAgent: 'Desktop Chrome', platform: 'Win32' });

describe('choosePrintRasterScale', () => {
	it.each([
		['business card', 85, 55],
		['A4 letterhead', 210, 297],
		['DL envelope', 220, 110],
	])('targets 600 DPI for %s within the default budget', (_name, width, height) => {
		const result = choosePrintRasterScale(width, height, desktop);

		expect(result.effectiveDpi).toBeGreaterThanOrEqual(599);
		expect(result.effectiveDpi).toBeLessThanOrEqual(600.1);
		expect(result.totalPhysicalPixels).toBeLessThanOrEqual(PRINT_BATCH_ONE_MAX_PIXELS);
		expect(Math.max(result.physicalWidthPixels, result.physicalHeightPixels)).toBeLessThanOrEqual(12_000);
	});

	it('selects the low-memory pixel cap for devices with 4 GB RAM or less', () => {
		const lowMemory = getPrintRasterLimits({ deviceMemory: 4, userAgent: 'Desktop Chrome', platform: 'Win32' });
		const result = choosePrintRasterScale(210, 297, lowMemory);

		expect(lowMemory.maxPixels).toBe(PRINT_LOW_MEMORY_MAX_PIXELS);
		expect(result.totalPhysicalPixels).toBeLessThanOrEqual(PRINT_LOW_MEMORY_MAX_PIXELS);
		expect(result.effectiveDpi).toBeGreaterThanOrEqual(300);
		expect(result.effectiveDpi).toBeLessThan(600);
	});

	it('uses the low-memory cap for iOS and refuses when the effective resolution would be below 300 DPI', () => {
		const ios = getPrintRasterLimits({ userAgent: 'Mozilla/5.0 (iPhone)', deviceMemory: 8 });
		expect(ios.maxPixels).toBe(PRINT_LOW_MEMORY_MAX_PIXELS);
		expect(() => choosePrintRasterScale(85, 55, { ...desktop, maxPixels: 1_000 }))
			.toThrow(/cannot be rasterized at 300 DPI.*Remove unsupported characters to export a vector PDF/);
	});
});
