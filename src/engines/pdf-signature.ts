import { parsePageRanges } from './pdf';

export type SignaturePosition = 'bottom-left' | 'bottom-center' | 'bottom-right';

export interface PdfSignatureOptions {
	position: SignaturePosition;
	width: number;
	margin: number;
}

export function normalizePdfSignatureOptions(position: SignaturePosition, width: number, margin: number): PdfSignatureOptions {
	if (!['bottom-left', 'bottom-center', 'bottom-right'].includes(position)) {
		throw new Error('Choose a valid signature position.');
	}
	if (!Number.isFinite(width) || width < 60 || width > 360) {
		throw new Error('Signature width must be between 60 and 360 points.');
	}
	if (!Number.isFinite(margin) || margin < 0 || margin > 144) {
		throw new Error('Margin must be between 0 and 144 points.');
	}
	return { position, width, margin };
}

export function selectedSignaturePages(allPages: boolean, ranges: string, pageCount: number): number[] {
	if (pageCount < 1) throw new Error('The PDF has no pages to sign.');
	return allPages ? Array.from({ length: pageCount }, (_, index) => index) : parsePageRanges(ranges, pageCount);
}
