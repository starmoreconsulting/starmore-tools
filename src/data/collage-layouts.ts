export interface CollageLayout {
	id: string;
	name: string;
	photoCount: number;
	rows: number[];
}

export const collageLayouts: CollageLayout[] = [
	{ id: 'two-stack', name: 'Two stacked', photoCount: 2, rows: [1, 1] },
	{ id: 'two-side-by-side', name: 'Two side by side', photoCount: 2, rows: [2] },
	{ id: 'three-top-heavy', name: 'Three · one over two', photoCount: 3, rows: [1, 2] },
	{ id: 'three-bottom-heavy', name: 'Three · two over one', photoCount: 3, rows: [2, 1] },
	{ id: 'three-row', name: 'Three in a row', photoCount: 3, rows: [3] },
	{ id: 'four-grid', name: 'Four grid', photoCount: 4, rows: [2, 2] },
	{ id: 'four-feature', name: 'Four · one feature row', photoCount: 4, rows: [1, 1, 2] },
	{ id: 'five-balanced', name: 'Five · two and three', photoCount: 5, rows: [2, 3] },
	{ id: 'five-feature', name: 'Five · one feature row', photoCount: 5, rows: [1, 2, 2] },
	{ id: 'six-grid', name: 'Six grid', photoCount: 6, rows: [3, 3] },
	{ id: 'six-three-rows', name: 'Six · three rows', photoCount: 6, rows: [2, 2, 2] },
	{ id: 'seven-feature', name: 'Seven · three rows', photoCount: 7, rows: [3, 2, 2] },
	{ id: 'eight-feature', name: 'Eight · one feature row', photoCount: 8, rows: [2, 3, 3] },
	{ id: 'eight-grid', name: 'Eight grid', photoCount: 8, rows: [4, 4] },
	{ id: 'nine-grid', name: 'Nine grid', photoCount: 9, rows: [3, 3, 3] },
];
