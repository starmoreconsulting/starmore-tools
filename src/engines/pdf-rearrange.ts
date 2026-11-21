export function parseReorderedPages(value: string, pageCount: number): number[] {
	if (!value.trim()) throw new Error('Enter the new page order, for example 3, 1, 2.');
	const tokens = value.split(',').map((part) => part.trim());
	if (tokens.some((token) => !/^\d+$/.test(token))) throw new Error('Use page numbers separated by commas, for example 3, 1, 2.');
	const pages = tokens.map((token) => Number(token));
	if (pages.some((page) => page < 1 || page > pageCount)) throw new Error(`Page order is outside the document. This PDF has ${pageCount} pages.`);
	return [...new Set(pages)].map((page) => page - 1);
}
