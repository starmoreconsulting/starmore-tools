export type PhotoSizeUnit = 'mm' | 'in';

export interface PhotoSize {
	id: string;
	name: string;
	width: number;
	height: number;
	unit: PhotoSizeUnit;
}

export const photoSizesLastChecked = '2026-11-14';

export const commonPhotoSizes: PhotoSize[] = [
	{ id: '35x45-mm', name: '35 × 45 mm', width: 35, height: 45, unit: 'mm' },
	{ id: '2x2-in', name: '2 × 2 in', width: 2, height: 2, unit: 'in' },
	{ id: '50x70-mm', name: '50 × 70 mm', width: 50, height: 70, unit: 'mm' },
	{ id: '40x50-mm', name: '40 × 50 mm', width: 40, height: 50, unit: 'mm' },
	{ id: '30x40-mm', name: '30 × 40 mm', width: 30, height: 40, unit: 'mm' },
];

export interface PixelSize {
	width: number;
	height: number;
}

export function photoSizeToPixels(size: PhotoSize, dpi = 300): PixelSize {
	if (!Number.isFinite(size.width) || !Number.isFinite(size.height) || size.width <= 0 || size.height <= 0) {
		throw new Error('Photo width and height must be positive numbers.');
	}
	if (!Number.isFinite(dpi) || dpi <= 0) throw new Error('Resolution must be a positive number.');
	const millimetersPerUnit = size.unit === 'in' ? 25.4 : 1;
	return {
		width: Math.round(size.width * millimetersPerUnit / 25.4 * dpi),
		height: Math.round(size.height * millimetersPerUnit / 25.4 * dpi),
	};
}

export interface PrintSheetSize {
	id: '4x6' | 'a5' | 'a4';
	name: string;
	widthMm: number;
	heightMm: number;
}

export const printSheetSizes: PrintSheetSize[] = [
	{ id: '4x6', name: '4 × 6 in', widthMm: 101.6, heightMm: 152.4 },
	{ id: 'a5', name: 'A5', widthMm: 148, heightMm: 210 },
	{ id: 'a4', name: 'A4', widthMm: 210, heightMm: 297 },
];

export interface PrintPlacement {
	xMm: number;
	yMm: number;
	widthMm: number;
	heightMm: number;
	row: number;
	column: number;
}

export interface PrintSheetLayout {
	widthMm: number;
	heightMm: number;
	marginMm: number;
	gapMm: number;
	columns: number;
	rows: number;
	copies: number;
	placements: PrintPlacement[];
}

export function layoutPrintSheet(
	sheet: PrintSheetSize,
	photo: PhotoSize,
	marginMm = 3,
	gapMm = 2,
): PrintSheetLayout {
	const toMm = (value: number, unit: PhotoSizeUnit) => unit === 'in' ? value * 25.4 : value;
	const photoWidthMm = toMm(photo.width, photo.unit);
	const photoHeightMm = toMm(photo.height, photo.unit);
	if (photoWidthMm <= 0 || photoHeightMm <= 0 || marginMm < 0 || gapMm < 0) {
		throw new Error('Sheet and photo sizes, margins, and spacing must be valid positive measurements.');
	}
	const columns = Math.max(0, Math.floor((sheet.widthMm - 2 * marginMm + gapMm) / (photoWidthMm + gapMm)));
	const rows = Math.max(0, Math.floor((sheet.heightMm - 2 * marginMm + gapMm) / (photoHeightMm + gapMm)));
	const placements: PrintPlacement[] = [];
	for (let row = 0; row < rows; row += 1) {
		for (let column = 0; column < columns; column += 1) {
			placements.push({
				xMm: marginMm + column * (photoWidthMm + gapMm),
				yMm: marginMm + row * (photoHeightMm + gapMm),
				widthMm: photoWidthMm,
				heightMm: photoHeightMm,
				row,
				column,
			});
		}
	}
	return {
		widthMm: sheet.widthMm,
		heightMm: sheet.heightMm,
		marginMm,
		gapMm,
		columns,
		rows,
		copies: placements.length,
		placements,
	};
}
