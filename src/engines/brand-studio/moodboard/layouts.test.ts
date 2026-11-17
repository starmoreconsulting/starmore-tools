import { describe, expect, it } from 'vitest';
import { getDownscaledDimensions, shouldRefuseLargeMoodBoardUpload } from './images';
import { getMoodBoardCells, MOOD_BOARD_IMAGE_COUNTS, MOOD_BOARD_PRESETS } from './layouts';

describe('mood board layouts', () => {
	it('keeps 3 to 9 image cells inside the artboard without overlap', () => {
		for (const preset of Object.values(MOOD_BOARD_PRESETS)) {
			for (const count of MOOD_BOARD_IMAGE_COUNTS) {
				const cells = getMoodBoardCells(count);
				expect(cells).toHaveLength(count);
				for (const cell of cells) {
					expect(cell.x).toBeGreaterThanOrEqual(0);
					expect(cell.y).toBeGreaterThanOrEqual(0);
					expect(cell.x + cell.width).toBeLessThanOrEqual(1);
					expect(cell.y + cell.height).toBeLessThanOrEqual(1);
				}
				for (let first = 0; first < cells.length; first += 1) {
					for (let second = first + 1; second < cells.length; second += 1) {
						const a = cells[first];
						const b = cells[second];
						expect(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y).toBe(true);
					}
				}
			}
		}
	});

	it('downscales oversized photos while preserving their aspect ratio', () => {
		expect(getDownscaledDimensions(6000, 4000)).toEqual({ width: 2048, height: 1365 });
		expect(getDownscaledDimensions(800, 600)).toEqual({ width: 800, height: 600 });
	});

	it('refuses large source files on devices classified as low-memory', () => {
		expect(shouldRefuseLargeMoodBoardUpload(4 * 1024 * 1024, true)).toBe(true);
		expect(shouldRefuseLargeMoodBoardUpload(2 * 1024 * 1024, true)).toBe(false);
		expect(shouldRefuseLargeMoodBoardUpload(4 * 1024 * 1024, false)).toBe(false);
	});
});
