export const namePatterns = [
	'{keyword} {word}',
	'{word} {keyword}',
	'{keyword}{word}',
	'{prefix}{keyword}',
	'{keyword}{suffix}',
	'{blend}',
	'{invented}',
] as const;

export const namePrefixes = ['north', 'bright', 'ever', 'open', 'true', 'hello', 'good', 'new'];
export const nameSuffixes = ['ly', 'ora', 'works', 'house', 'wise', 'nest', 'field', 'co'];
