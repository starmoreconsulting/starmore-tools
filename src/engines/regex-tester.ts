export interface RegexMatch {
	text: string;
	index: number;
	end: number;
	groups: Array<string | undefined>;
	namedGroups: Record<string, string>;
}

export interface RegexTestResult {
	matches: RegexMatch[];
	replaced: string;
	count: number;
	error: string;
}

export interface RegexTestOptions {
	pattern: string;
	flags: string;
	text: string;
	replacement: string;
	maxMatches?: number;
}

export function normalizeRegexFlags(flags: string): string {
	const unique = Array.from(new Set(flags.replace(/[^dgimsuvy]/g, '').split(''))).sort().join('');
	if (unique.includes('d')) return unique;
	return unique;
}

export function testRegex(options: RegexTestOptions): RegexTestResult {
	const { pattern, text, replacement } = options;
	let flags = normalizeRegexFlags(options.flags);
	const maxMatches = Math.min(Math.max(options.maxMatches ?? 500, 1), 5000);

	if (!pattern) return { matches: [], replaced: text, count: 0, error: '' };

	try {
		const regex = new RegExp(pattern, flags);
		const matches: RegexMatch[] = [];
		let matchCount = 0;
		const globalRegex = flags.includes('g') ? regex : new RegExp(pattern, `${flags}g`);

		let match: RegExpExecArray | null;
		while ((match = globalRegex.exec(text)) !== null) {
			matchCount += 1;
			if (matches.length < maxMatches) {
				matches.push({
					text: match[0],
					index: match.index,
					end: match.index + match[0].length,
					groups: match.slice(1).map((value) => value),
					namedGroups: match.groups ? Object.fromEntries(Object.entries(match.groups).map(([key, value]) => [key, value ?? ''])) : {},
				});
			}
			if (match[0] === '') globalRegex.lastIndex += 1;
			if (!flags.includes('g') && matches.length >= maxMatches) break;
		}

		let replaced = text;
		if (replacement.length > 0) {
			const replaceRegex = new RegExp(pattern, flags.includes('g') ? flags : `${flags}g`);
			replaced = text.replace(replaceRegex, replacement);
		}

		return { matches, replaced, count: matchCount, error: '' };
	} catch (error) {
		return {
			matches: [],
			replaced: text,
			count: 0,
			error: error instanceof Error ? error.message : 'Invalid regular expression.',
		};
	}
}
