function capitalizedWords(values: readonly string[]): Set<string> {
	return new Set(values.flatMap((value) => value.match(/\p{Lu}[\p{L}'-]*/gu) ?? []));
}

export function isCleanGeneratedText(text: string, userInput: readonly string[] = []): boolean {
	if (/undefined|null|NaN|\[object/i.test(text) || /[{}]/.test(text) || / {2,}/.test(text)) return false;
	if (/\bThis brand\b|\bYour business\b/i.test(text)) return false;
	const properNouns = capitalizedWords(userInput);
	for (const match of text.matchAll(/,\s+([A-Z][\p{L}'-]*)/gu)) {
		if (!properNouns.has(match[1])) return false;
	}
	return true;
}

export function sanitizeGeneratedText(value: string): string {
	return value
		.replace(/[{}]/g, '')
		.replace(/[^\S\r\n]+/g, ' ')
		.replace(/\s+([,!.?;:])/g, '$1')
		.replace(/([,!.?;:])(?:\s*[,!.?;:])+/g, (marks: string) => {
			if (marks.includes('?')) return '?';
			if (marks.includes('!')) return '!';
			if (marks.includes('.')) return '.';
			if (marks.includes(';')) return ';';
			if (marks.includes(':')) return ':';
			return marks.includes(',') ? ',' : '.';
		})
		.trim();
}
