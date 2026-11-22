export function normalizeExtractedPageText(text: string): string[] {
	return text
		.replace(/\r\n/g, '\n')
		.replace(/\r/g, '\n')
		.split('\n')
		.map((line) => line.trim())
		.filter((line) => line.length > 0);
}

export function summarizePdfWordConversion(pageCount: number, extractedLines: number) {
	return {
		pageCount,
		extractedLines,
		imageOnlyLikely: extractedLines === 0,
	};
}
