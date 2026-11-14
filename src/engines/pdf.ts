import { PDFDocument } from 'pdf-lib';

export async function readPdf(file: File): Promise<PDFDocument> {
	try {
		return await PDFDocument.load(await file.arrayBuffer());
	} catch {
		throw new Error(`Could not read “${file.name}”. The PDF may be damaged or password-protected.`);
	}
}

export function parsePageGroups(value: string, pageCount: number): number[][] {
	const tokens = value.split(',').map((part) => part.trim());
	if (!value.trim() || tokens.some((token) => !token)) throw new Error('Enter page numbers or ranges, for example 1-3, 5, 8-10.');
	const groups: number[][] = [];
	for (const token of tokens) {
		const match = /^(\d+)(?:\s*-\s*(\d+))?$/.exec(token);
		if (!match) throw new Error(`Invalid page range: “${token}”. Use numbers and ranges such as 1-3, 5.`);
		const start = Number(match[1]);
		const end = Number(match[2] ?? match[1]);
		if (start < 1 || end < start || end > pageCount) {
			throw new Error(`Page range “${token}” is outside the document. This PDF has ${pageCount} pages.`);
		}
		const group: number[] = [];
		for (let page = start; page <= end; page += 1) group.push(page - 1);
		groups.push(group);
	}
	return groups;
}

export function parsePageRanges(value: string, pageCount: number): number[] {
	return [...new Set(parsePageGroups(value, pageCount).flat())].sort((first, second) => first - second);
}

export function triggerDownload(blob: Blob, filename: string) {
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = filename;
	link.click();
	window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function pdfErrorMessage(error: unknown) {
	return error instanceof Error ? error.message : 'Could not process this PDF. It may be damaged or password-protected.';
}
