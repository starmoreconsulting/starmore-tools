import { unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import {
	calculateOutputDimensions,
	createImageZip,
	createOutputFilename,
	isSupportedRasterImage,
	validateBatchImageOptions,
	type BatchImageOptions,
} from './batch-image-optimizer';

const validOptions: BatchImageOptions = {
	maxWidth: 1920,
	maxHeight: 1080,
	format: 'image/webp',
	quality: 80,
};

describe('batch image optimizer engine', () => {
	it('validates dimension bounds, integer values, formats, and quality', () => {
		expect(validateBatchImageOptions(validOptions)).toBeNull();
		expect(validateBatchImageOptions({ ...validOptions, maxWidth: 0 })).toContain('Maximum width');
		expect(validateBatchImageOptions({ ...validOptions, maxHeight: 20001 })).toContain('Maximum height');
		expect(validateBatchImageOptions({ ...validOptions, quality: 9 })).toContain('Quality');
		expect(validateBatchImageOptions({ ...validOptions, maxWidth: 10.5 })).toContain('whole number');
		expect(validateBatchImageOptions({ ...validOptions, format: 'image/gif' as BatchImageOptions['format'] })).toContain('output format');
	});

	it('accepts common raster formats but excludes SVG', () => {
		expect(isSupportedRasterImage({ name: 'photo.avif', type: 'image/avif' })).toBe(true);
		expect(isSupportedRasterImage({ name: 'scan.png', type: '' })).toBe(true);
		expect(isSupportedRasterImage({ name: 'drawing.svg', type: 'image/svg+xml' })).toBe(false);
		expect(isSupportedRasterImage({ name: 'notes.txt', type: 'text/plain' })).toBe(false);
	});

	it('resizes proportionally without enlarging and bounds canvas pixel count', () => {
		expect(calculateOutputDimensions(4000, 2000, { maxWidth: 1000, maxHeight: 900 })).toEqual({ width: 1000, height: 500 });
		expect(calculateOutputDimensions(400, 300, { maxWidth: 1000, maxHeight: 900 })).toEqual({ width: 400, height: 300 });
		const large = calculateOutputDimensions(10_000, 10_000, { maxWidth: 20_000, maxHeight: 20_000 });
		expect(large.width * large.height).toBeLessThanOrEqual(40_000_000);
	});

	it('preserves readable source names and makes duplicate outputs unique', () => {
		const used = new Set<string>();
		expect(createOutputFilename('C:\\photos\\summer trip.png', 'image/jpeg', used)).toBe('summer trip-optimized.jpg');
		expect(createOutputFilename('summer trip.jpg', 'image/jpeg', used)).toBe('summer trip-optimized-2.jpg');
		expect(createOutputFilename('../folder/photo?.png', 'image/png')).not.toContain('..');
	});

	it('packages successful outputs in a ZIP with their output filenames and bytes', async () => {
		const archive = await createImageZip([
			{ name: 'portrait-optimized.webp', blob: new Blob(['webp-bytes'], { type: 'image/webp' }) },
			{ name: 'landscape-optimized.webp', blob: new Blob(['other-image'], { type: 'image/webp' }) },
		]);
		expect(archive.type).toBe('application/zip');
		const entries = unzipSync(new Uint8Array(await archive.arrayBuffer()));
		expect(Object.keys(entries).sort()).toEqual(['landscape-optimized.webp', 'portrait-optimized.webp']);
		expect(new TextDecoder().decode(entries['portrait-optimized.webp'])).toBe('webp-bytes');
	});
});
