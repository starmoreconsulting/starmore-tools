export function estimateCompressedPdfSize(originalBytes: number, quality: number) {
	if (!Number.isFinite(originalBytes) || originalBytes < 0) throw new Error('Invalid PDF file size.');
	if (!Number.isFinite(quality) || quality < 1 || quality > 100) throw new Error('Compression quality must be between 1 and 100.');
	const normalized = quality / 100;
	return Math.max(1, Math.round(originalBytes * (0.35 + 0.65 * normalized * normalized)));
}
