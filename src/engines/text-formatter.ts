export type FormatMode = 'plain' | 'paragraphs' | 'single-line';

export function formatText(text: string, mode: FormatMode, lineLength: number) {
	const normalized = text.replace(/\r\n|[\r\u2028\u2029]/g, '\n').replace(/[\t\p{Zs}]+/gu, ' ').replace(/\n[\t\p{Zs}]+/gu, '\n').trim();
	if (normalized === '') return '';
	if (mode === 'single-line') return normalized.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();

	let paragraphs = normalized.split(/\n\s*\n/).map((paragraph) => paragraph.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim()).filter(Boolean);
	if (mode === 'paragraphs') {
		paragraphs = paragraphs.map((paragraph) => {
			if (!Number.isInteger(lineLength) || lineLength < 12 || lineLength > 200) return paragraph;
			const words = paragraph.split(/\s+/);
			const lines: string[] = [];
			let line = '';
			for (const word of words) {
				const candidate = line ? `${line} ${word}` : word;
				if (line && candidate.length > lineLength) {
					lines.push(line);
					line = word;
				} else {
					line = candidate;
				}
			}
			if (line) lines.push(line);
			return lines.join('\n');
		});
	}
	return paragraphs.join('\n\n');
}
