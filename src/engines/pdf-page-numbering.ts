export type PageNumberPosition = 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
export type PageNumberFormat = 'number' | 'page-number' | 'page-of-total';

export function formatPageNumber(format: PageNumberFormat, pageNumber: number, totalPages: number) {
	if (format === 'page-number') return `Page ${pageNumber}`;
	if (format === 'page-of-total') return `${pageNumber} / ${totalPages}`;
	return String(pageNumber);
}

export function normalizePageNumberOptions(startNumber: number, size: number) {
	if (!Number.isInteger(startNumber) || startNumber < 1) throw new Error('Start number must be a positive whole number.');
	if (!Number.isFinite(size) || size < 6 || size > 72) throw new Error('Font size must be between 6 and 72 points.');
	return { startNumber, size };
}
