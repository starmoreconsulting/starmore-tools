import { describe, expect, it } from 'vitest';
import { normalizeWatermarkOptions, normalizeWatermarkText } from './pdf-watermark';

describe('PDF watermark helpers', () => {
	it('normalizes watermark text', () => {
		expect(normalizeWatermarkText('  Confidential   copy  ')).toBe('Confidential copy');
		expect(normalizeWatermarkText('x'.repeat(250))).toHaveLength(200);
	});

	it('normalizes size, opacity and rotation', () => {
		expect(normalizeWatermarkOptions(36, 45, -25)).toEqual({ size: 36, opacity: 0.45, rotation: -25 });
		expect(() => normalizeWatermarkOptions(2, 45, 0)).toThrow('Font size');
		expect(() => normalizeWatermarkOptions(36, 101, 0)).toThrow('Opacity');
		expect(() => normalizeWatermarkOptions(36, 45, 181)).toThrow('Rotation');
	});
});
