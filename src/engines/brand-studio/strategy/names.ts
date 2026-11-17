import { offensiveTerms } from '../../../data/brand/blocklist-offensive';
import { industryWords, styleWords } from '../../../data/brand/word-banks';
import { namePatterns, namePrefixes, nameSuffixes } from '../../../data/brand/name-patterns';
import type { LogoIndustry, LogoStyle } from '../../logo-studio/model/types';
import { createSeededRandom } from './random';

export type NameLength = 'short' | 'balanced' | 'long';

export interface BrandNameOptions {
	keywords: string[];
	industry: LogoIndustry;
	style: LogoStyle;
	length: NameLength;
	startingLetter?: string;
	seed: number;
	count?: number;
}

const LENGTHS: Record<NameLength, [number, number]> = {
	short: [3, 8],
	balanced: [5, 13],
	long: [9, 20],
};
const SYLLABLES = ['luma', 'nori', 'vella', 'mira', 'sora', 'tavi', 'elora', 'niva', 'runo', 'kora', 'zella', 'avon'];

function normalized(value: string): string {
	return value.normalize('NFKD').replace(/\p{M}/gu, '').toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
}

export function isOffensiveName(value: string): boolean {
	const candidate = normalized(value);
	return offensiveTerms.some((term) => candidate.includes(normalized(term)));
}

function isPronounceable(value: string): boolean {
	const latin = value.toLocaleLowerCase().replace(/[^a-z]/g, '');
	if (!latin) return Array.from(value).some((character) => /\p{L}/u.test(character));
	if (latin.length <= 2) return true;
	return /[aeiouy]/.test(latin) && !/[bcdfghjklmnpqrstvwxz]{5}/i.test(latin);
}

function blend(first: string, second: string): string {
	const left = Array.from(first);
	const right = Array.from(second);
	if (left.length < 2 || right.length < 2) return `${first}${second}`;
	return left.slice(0, Math.ceil(left.length / 2)).join('')
		+ right.slice(Math.floor(right.length / 2)).join('');
}

function choose<T>(items: readonly T[], random: () => number): T {
	return items[Math.floor(random() * items.length)];
}

export function generateBrandNames(options: BrandNameOptions): string[] {
	const random = createSeededRandom(options.seed);
	const count = Math.min(24, Math.max(1, options.count ?? 24));
	const [minimum, maximum] = LENGTHS[options.length];
	const keywords = options.keywords.map((keyword) => keyword.trim()).filter(Boolean).slice(0, 5);
	const roots = keywords.length ? keywords : [...industryWords[options.industry]];
	const words = [...new Set([...industryWords[options.industry], ...styleWords[options.style]])];
	const results: string[] = [];
	const seen = new Set<string>();
	const startingLetter = options.startingLetter?.trim().slice(0, 1) ?? '';
	const attempts = Math.max(3000, count * 500);

	for (let attempt = 0; attempt < attempts && results.length < count; attempt += 1) {
		const root = choose(roots, random);
		const word = choose(words, random);
		const prefix = choose(namePrefixes, random);
		const suffix = choose(nameSuffixes, random);
		const other = choose(roots, random);
		const pattern = namePatterns[Math.floor(random() * namePatterns.length)];
		const invented = choose(SYLLABLES, random) + choose(SYLLABLES, random);
		let candidate = pattern
			.replace('{keyword}', root)
			.replace('{word}', word)
			.replace('{prefix}', prefix)
			.replace('{suffix}', suffix)
			.replace('{blend}', blend(root, other))
			.replace('{invented}', invented)
			.trim();
		candidate = candidate.replace(/\s+/g, ' ');
		if (startingLetter && !candidate.toLocaleLowerCase().startsWith(startingLetter.toLocaleLowerCase())) {
			candidate = `${startingLetter}${candidate}`;
		}
		const length = Array.from(candidate.replace(/\s/g, '')).length;
		if (length < minimum || length > maximum) continue;
		if (/(.)\1{2}/u.test(candidate) || isOffensiveName(candidate) || !isPronounceable(candidate)) continue;
		const key = candidate.normalize('NFKC').toLocaleLowerCase().replace(/\s+/g, ' ').trim();
		if (seen.has(key)) continue;
		seen.add(key);
		results.push(candidate);
	}
	return results;
}
