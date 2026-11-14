import { describe, expect, it } from 'vitest';
import { commonPhotoSizes, layoutPrintSheet, photoSizeToPixels, printSheetSizes } from './photo-sizes';

describe('photoSizeToPixels', () => {
	it('converts 35 × 45 mm to 413 × 531 px at 300 DPI', () => {
		expect(photoSizeToPixels(commonPhotoSizes[0], 300)).toEqual({ width: 413, height: 531 });
	});
});

describe('layoutPrintSheet', () => {
	it('fits copies within every sheet while respecting the margins', () => {
		for (const sheet of printSheetSizes) {
			const layout = layoutPrintSheet(sheet, commonPhotoSizes[0], 3, 2);

			expect(layout.copies).toBe(layout.rows * layout.columns);
			expect(layout.copies).toBeGreaterThan(0);
			for (const placement of layout.placements) {
				expect(placement.xMm).toBeGreaterThanOrEqual(layout.marginMm);
				expect(placement.yMm).toBeGreaterThanOrEqual(layout.marginMm);
				expect(placement.xMm + placement.widthMm).toBeLessThanOrEqual(sheet.widthMm - layout.marginMm + 1e-9);
				expect(placement.yMm + placement.heightMm).toBeLessThanOrEqual(sheet.heightMm - layout.marginMm + 1e-9);
			}
		}
	});
});
