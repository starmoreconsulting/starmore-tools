export function countWords(text: string) {
	const words = text.trim().match(/\S+/g) ?? [];
	const characters = text.length;
	const charactersWithoutSpaces = text.replace(/\s/g, '').length;
	const readingMinutes = words.length === 0 ? 0 : Math.max(1, Math.ceil(words.length / 200));

	return { words: words.length, characters, charactersWithoutSpaces, readingMinutes };
}

export function toTitleCase(text: string) {
	return text.toLowerCase().replace(/(^|[\s([{])([a-z])/g, (_match, prefix: string, letter: string) =>
		`${prefix}${letter.toUpperCase()}`,
	);
}

export function toSentenceCase(text: string) {
	return text.toLowerCase().replace(/(^\s*[a-z]|[.!?]\s+[a-z])/g, (match) => match.toUpperCase());
}
