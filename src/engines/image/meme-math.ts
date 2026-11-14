export interface FittedText {
	fontSize: number;
	lines: string[];
	lineHeight: number;
}

export function fitTextToBox(
	text: string,
	maxWidth: number,
	maxHeight: number,
	preferredSize: number,
	measure: (text: string, fontSize: number) => number,
	lineHeight = 1.1,
): FittedText {
	if (!Number.isFinite(maxWidth) || !Number.isFinite(maxHeight) || !Number.isFinite(preferredSize)
		|| maxWidth <= 0 || maxHeight <= 0 || preferredSize <= 0 || lineHeight <= 0) {
		throw new Error('Text box dimensions must be positive.');
	}
	const words = text.trim().split(/\s+/).filter(Boolean);
	if (!words.length) return { fontSize: preferredSize, lines: [], lineHeight };

	const wrap = (fontSize: number): string[] => {
		const lines: string[] = [];
		let line = '';
		for (const word of words) {
			const candidate = line ? `${line} ${word}` : word;
			if (measure(candidate, fontSize) <= maxWidth) {
				line = candidate;
				continue;
			}
			if (line) lines.push(line);
			line = '';
			for (const character of Array.from(word)) {
				const next = line + character;
				if (line && measure(next, fontSize) > maxWidth) {
					lines.push(line);
					line = character;
				} else line = next;
			}
		}
		if (line) lines.push(line);
		return lines;
	};

	let fontSize = preferredSize;
	for (let attempt = 0; attempt < 120; attempt += 1) {
		const lines = wrap(fontSize);
		const maxLines = Math.max(1, Math.floor(maxHeight / (fontSize * lineHeight)));
		if (lines.length <= maxLines && lines.every((line) => measure(line, fontSize) <= maxWidth)) {
			return { fontSize, lines, lineHeight };
		}
		fontSize *= 0.9;
	}
	const minSize = Math.min(preferredSize, maxHeight / lineHeight, maxWidth);
	const lines = wrap(minSize);
	return {
		fontSize: minSize,
		lines: lines.slice(0, Math.max(1, Math.floor(maxHeight / (minSize * lineHeight)))),
		lineHeight,
	};
}
