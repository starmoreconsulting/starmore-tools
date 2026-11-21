export function countCharacters(text: string) {
	const characters = Array.from(text).length;
	const charactersWithoutSpaces = Array.from(text.replace(/\s/g, '')).length;
	const words = text.trim().match(/\S+/g) ?? [];
	const lines = text.length === 0 ? 0 : text.split(/\r\n|[\n\r\u2028\u2029]/).length;
	return { characters, charactersWithoutSpaces, words: words.length, lines };
}

export function countWords(text: string) {
	const counts = countCharacters(text);
	const readingMinutes = counts.words === 0 ? 0 : Math.max(1, Math.ceil(counts.words / 200));

	return {
		words: counts.words,
		characters: counts.characters,
		charactersWithoutSpaces: counts.charactersWithoutSpaces,
		readingMinutes,
	};
}

export function toTitleCase(text: string) {
	return text.toLowerCase().replace(/(^|[\s([{])([a-z])/g, (_match, prefix: string, letter: string) =>
		`${prefix}${letter.toUpperCase()}`,
	);
}

export function toSentenceCase(text: string) {
	return text.toLowerCase().replace(/(^\s*[a-z]|[.!?]\s+[a-z])/g, (match) => match.toUpperCase());
}

export function cleanWhitespace(
	text: string,
	collapseInline: boolean,
	trimLines: boolean,
	removeBlankLines: boolean,
) {
	const sourceLines = text.split(/\r\n|[\n\r\u2028\u2029]/);
	let lines = sourceLines;
	if (collapseInline) lines = lines.map((line) => line.replace(/[\t\p{Zs}]+/gu, ' '));
	if (trimLines) lines = lines.map((line) => line.trim());
	const removedBlankLines = text.length === 0 || !removeBlankLines ? 0 : sourceLines.filter((line) => line.trim() === '').length;
	if (removeBlankLines) lines = lines.filter((line) => line.trim() !== '');
	return { result: lines.join('\n'), removedBlankLines };
}

function escapeRegExp(value: string) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function createReplacementPattern(find: string, matchCase: boolean, wholeWord: boolean, regexMode: boolean) {
	const source = regexMode ? find : escapeRegExp(find);
	const bounded = wholeWord ? `(?<![\\p{L}\\p{N}_])(?:${source})(?![\\p{L}\\p{N}_])` : source;
	return new RegExp(bounded, matchCase ? 'gu' : 'giu');
}

export function replaceText(
	text: string,
	find: string,
	replacement: string,
	matchCase: boolean,
	wholeWord: boolean,
	regexMode: boolean,
) {
	if (find === '') return { result: text, count: 0, error: 'Enter text or a pattern to find.' };
	try {
		const pattern = createReplacementPattern(find, matchCase, wholeWord, regexMode);
		const count = text.match(pattern)?.length ?? 0;
		const result = text.replace(pattern, replacement);
		return { result, count, error: '' };
	} catch {
		return { result: text, count: 0, error: 'This regular expression is invalid. Check the pattern and try again.' };
	}
}
