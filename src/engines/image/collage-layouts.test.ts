import { describe, expect, it } from 'vitest';
import { collageLayouts } from '../../data/collage-layouts';
import { calculateCollageCells } from './collage-engine';

describe('calculateCollageCells', () => {
	it('provides at least twelve layouts as data', () => {
		expect(collageLayouts.length).toBeGreaterThanOrEqual(12);
	});

	it('covers the padded canvas with the requested spacing and no overlap', () => {
		const width = 1200;
		const height = 1600;
		const spacing = 18;
		const padding = 32;

		for (const layout of collageLayouts) {
			const cells = calculateCollageCells(width, height, layout, spacing, padding);
			expect(cells).toHaveLength(layout.photoCount);

			let index = 0;
			const rows = layout.rows.map((columns) => cells.slice(index, index += columns));
			for (const row of rows) {
				expect(Math.min(...row.map((cell) => cell.x))).toBeCloseTo(padding);
				expect(Math.max(...row.map((cell) => cell.x + cell.width))).toBeCloseTo(width - padding);
				for (let column = 1; column < row.length; column += 1) {
					expect(row[column].x - (row[column - 1].x + row[column - 1].width)).toBeCloseTo(spacing);
				}
			}
			expect(rows[0][0].y).toBeCloseTo(padding);
			expect(rows[rows.length - 1][0].y + rows[rows.length - 1][0].height).toBeCloseTo(height - padding);
			for (let row = 1; row < rows.length; row += 1) {
				expect(rows[row][0].y - (rows[row - 1][0].y + rows[row - 1][0].height)).toBeCloseTo(spacing);
			}
			for (let first = 0; first < cells.length; first += 1) {
				for (let second = first + 1; second < cells.length; second += 1) {
					const a = cells[first];
					const b = cells[second];
					const overlapX = a.x < b.x + b.width && b.x < a.x + a.width;
					const overlapY = a.y < b.y + b.height && b.y < a.y + a.height;
					expect(overlapX && overlapY).toBe(false);
				}
			}
			const cellArea = cells.reduce((total, cell) => total + cell.width * cell.height, 0);
			const horizontalGutters = layout.rows.reduce((total, columns) => total + spacing * (columns - 1) * cells[0].height, 0);
			const verticalGutters = spacing * (rows.length - 1) * (width - padding * 2);
			expect(cellArea + horizontalGutters + verticalGutters).toBeCloseTo((width - padding * 2) * (height - padding * 2));
		}
	});
});
