import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export const PDF_ANNOTATION_MAX_FILE_BYTES = 50_000_000;
export const PDF_ANNOTATION_MAX_PAGES = 100;
export const PDF_ANNOTATION_MAX_MARKS = 200;
export const PDF_ANNOTATION_MAX_NOTE_LENGTH = 240;

export interface PdfNoteAnnotation {
	type: 'note';
	pageIndex: number;
	x: number;
	y: number;
	text: string;
}

export interface PdfHighlightAnnotation {
	type: 'highlight';
	pageIndex: number;
	x: number;
	y: number;
	width: number;
	height: number;
}

export type PdfAnnotation = PdfNoteAnnotation | PdfHighlightAnnotation;

export function validatePdfAnnotations(annotations: PdfAnnotation[], pageCount: number): void {
	if (!Number.isSafeInteger(pageCount) || pageCount < 1) throw new Error('The PDF does not contain any pages.');
	if (pageCount > PDF_ANNOTATION_MAX_PAGES) {
		throw new Error(`This tool supports PDFs with up to ${PDF_ANNOTATION_MAX_PAGES} pages.`);
	}
	if (annotations.length === 0) throw new Error('Add at least one note or highlight before downloading.');
	if (annotations.length > PDF_ANNOTATION_MAX_MARKS) {
		throw new Error(`Add no more than ${PDF_ANNOTATION_MAX_MARKS} annotations to one PDF.`);
	}
	for (const [index, annotation] of annotations.entries()) {
		if (!Number.isSafeInteger(annotation.pageIndex) || annotation.pageIndex < 0 || annotation.pageIndex >= pageCount) {
			throw new Error(`Annotation ${index + 1} refers to a page that is not in this PDF.`);
		}
		if (![annotation.x, annotation.y].every((value) => Number.isFinite(value) && value >= 0 && value <= 1)) {
			throw new Error(`Annotation ${index + 1} has an invalid position.`);
		}
		if (annotation.type === 'note') {
			const text = annotation.text.trim();
			if (!text) throw new Error(`Note ${index + 1} is empty.`);
			if (text.length > PDF_ANNOTATION_MAX_NOTE_LENGTH) {
				throw new Error(`Notes must be ${PDF_ANNOTATION_MAX_NOTE_LENGTH} characters or fewer.`);
			}
		} else if (![annotation.width, annotation.height].every((value) => Number.isFinite(value) && value > 0)
			|| annotation.x + annotation.width > 1.001
			|| annotation.y + annotation.height > 1.001) {
			throw new Error(`Highlight ${index + 1} has an invalid size.`);
		}
	}
}

function wrapNote(text: string, font: Awaited<ReturnType<PDFDocument['embedFont']>>, size: number, maxWidth: number): string[] {
	const lines: string[] = [];
	const pushWord = (word: string, currentLine: string) => {
		if (font.widthOfTextAtSize(word, size) <= maxWidth) {
			const candidate = currentLine ? `${currentLine} ${word}` : word;
			if (currentLine && font.widthOfTextAtSize(candidate, size) > maxWidth) {
				lines.push(currentLine);
				return word;
			}
			return candidate;
		}

		let remaining = word;
		let line = currentLine;
		while (remaining) {
			let fittingLength = 1;
			while (fittingLength < remaining.length
				&& font.widthOfTextAtSize(remaining.slice(0, fittingLength + 1), size) <= maxWidth) {
				fittingLength += 1;
			}
			const piece = remaining.slice(0, fittingLength);
			remaining = remaining.slice(fittingLength);
			if (line) {
				lines.push(line);
				line = '';
			}
			if (remaining) lines.push(piece);
			else line = piece;
		}
		return line;
	};
	for (const paragraph of text.split(/\r?\n/)) {
		let line = '';
		for (const word of paragraph.split(/\s+/).filter(Boolean)) {
			line = pushWord(word, line);
		}
		lines.push(line);
	}
	return lines.length ? lines : [''];
}

export async function applyPdfAnnotations(data: Uint8Array, annotations: PdfAnnotation[]): Promise<Uint8Array> {
	let document: PDFDocument;
	try {
		document = await PDFDocument.load(data);
	} catch {
		throw new Error('Could not read the PDF. It may be damaged or password-protected.');
	}
	validatePdfAnnotations(annotations, document.getPageCount());
	const pages = document.getPages();
	const font = await document.embedFont(StandardFonts.Helvetica);

	for (const annotation of annotations) {
		const page = pages[annotation.pageIndex];
		const { width: pageWidth, height: pageHeight } = page.getSize();
		if (annotation.type === 'highlight') {
			page.drawRectangle({
				x: annotation.x * pageWidth,
				y: pageHeight - (annotation.y + annotation.height) * pageHeight,
				width: annotation.width * pageWidth,
				height: annotation.height * pageHeight,
				color: rgb(1, 0.88, 0.2),
				opacity: 0.35,
				borderColor: rgb(0.75, 0.56, 0.06),
				borderOpacity: 0.65,
				borderWidth: 0.6,
			});
			continue;
		}

		let lines: string[];
		try {
			lines = wrapNote(annotation.text.trim(), font, 10, 190);
		} catch {
			throw new Error(`Note on page ${annotation.pageIndex + 1} contains characters that cannot be embedded in the PDF's standard font. Use basic Latin characters.`);
		}
		const boxWidth = Math.min(210, pageWidth - 12);
		const lineHeight = 13;
		const boxHeight = Math.min(pageHeight - 12, 12 + lines.length * lineHeight);
		if (boxWidth < 40 || boxHeight < 20) {
			throw new Error(`Page ${annotation.pageIndex + 1} is too small to place a text note.`);
		}
		const x = Math.min(annotation.x * pageWidth, pageWidth - boxWidth - 6);
		const top = Math.min(annotation.y * pageHeight, pageHeight - boxHeight - 6);
		page.drawRectangle({
			x: Math.max(6, x),
			y: pageHeight - top - boxHeight,
			width: boxWidth,
			height: boxHeight,
			color: rgb(1, 0.96, 0.68),
			borderColor: rgb(0.7, 0.55, 0.18),
			borderWidth: 0.7,
		});
		lines.forEach((line, index) => {
			try {
				page.drawText(line, {
					x: Math.max(12, x + 6),
					y: pageHeight - top - 8 - (index + 1) * lineHeight,
					size: 10,
					font,
					color: rgb(0.16, 0.15, 0.11),
					maxWidth: boxWidth - 12,
				});
			} catch {
				throw new Error(`Note on page ${annotation.pageIndex + 1} contains characters that cannot be embedded in the PDF's standard font. Use basic Latin characters.`);
			}
		});
	}

	return document.save();
}
