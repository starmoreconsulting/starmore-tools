export interface NormalizedCell {
	x: number;
	y: number;
	width: number;
	height: number;
}

const ROWS_BY_COUNT: Record<number, number[]> = {
	3: [1, 2],
	4: [2, 2],
	5: [2, 3],
	6: [3, 3],
	7: [2, 2, 3],
	8: [2, 3, 3],
	9: [3, 3, 3],
};

export const MOOD_BOARD_IMAGE_COUNTS = Object.keys(ROWS_BY_COUNT).map(Number);

export function getMoodBoardCells(count: number): NormalizedCell[] {
	const rows = ROWS_BY_COUNT[count];
	if (!rows) throw new Error('Mood boards need between 3 and 9 image cells.');
	const left = 0.04;
	const top = 0.08;
	const usableWidth = 0.92;
	const usableHeight = 0.8;
	const gap = 0.02;
	const rowHeight = (usableHeight - gap * (rows.length - 1)) / rows.length;
	const cells: NormalizedCell[] = [];
	let y = top;
	for (const columns of rows) {
		const cellWidth = (usableWidth - gap * (columns - 1)) / columns;
		const rowWidth = columns * cellWidth + (columns - 1) * gap;
		let x = left + (usableWidth - rowWidth) / 2;
		for (let column = 0; column < columns; column += 1) {
			cells.push({ x, y, width: cellWidth, height: rowHeight });
			x += cellWidth + gap;
		}
		y += rowHeight + gap;
	}
	return cells;
}

export type MoodBoardPreset = 'square' | 'wide' | 'a4-landscape';

export const MOOD_BOARD_PRESETS: Record<MoodBoardPreset, { width: number; height: number; background: string }> = {
	square: { width: 1080, height: 1080, background: '#ffffff' },
	wide: { width: 1600, height: 900, background: '#ffffff' },
	'a4-landscape': { width: 3508, height: 2480, background: '#ffffff' },
};

export function getMoodBoardPreset(value: string): MoodBoardPreset {
	if (value === 'square' || value === 'wide' || value === 'a4-landscape') return value;
	throw new Error('Choose a square, 16:9, or A4 landscape mood board.');
}
