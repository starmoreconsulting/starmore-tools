import { offensiveTerms } from '../../../data/brand/blocklist-offensive';
import { industryWords, styleWords } from '../../../data/brand/word-banks';
import { namePatterns, namePrefixes, nameSuffixes } from '../../../data/brand/name-patterns';
import type { LogoIndustry, LogoStyle } from '../../logo-studio/model/types';
import { createSeededRandom } from './random';
import { sanitizeGeneratedText } from './sanitize';

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

export interface BrandNameGenerationReport {
	names: string[];
	filterFailures: Record<string, number>;
	candidatesChecked: number;
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

function accentStripped(value: string): string {
	return value.normalize('NFD').replace(/\p{M}/gu, '');
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
	const left = Array.from(accentStripped(first));
	const right = Array.from(accentStripped(second));
	if (left.length < 2 || right.length < 2) return `${left.join('')}${right.join('')}`;
	return left.slice(0, Math.ceil(left.length / 2)).join('')
		+ right.slice(Math.floor(right.length / 2)).join('');
}

export function getNameFilterFailures(value: string, length: NameLength): string[] {
	const failures: string[] = [];
	const compact = value.replace(/\s+/g, '');
	const plain = accentStripped(compact).toLocaleLowerCase();
	const [minimum, maximum] = LENGTHS[length];
	const characterCount = Array.from(compact).length;
	if (characterCount < minimum || characterCount > maximum) failures.push('length');
	if (/(.)\1{2}/u.test(plain)) failures.push('repeated-characters');
	if (/(a{2}|e{2}|i{2}|o{2}|u{2})/u.test(plain)) failures.push('adjacent-identical-vowels');
	if (/[aeiou]{3}/u.test(plain)) failures.push('vowel-run');
	if (/[bcdfghjklmnpqrstvwxyz]{4}/u.test(plain)) failures.push('consonant-run');
	if (!/[aeiou]/u.test(plain)) failures.push('no-vowel');
	if (/(\p{L}\p{M}+)\1/iu.test(compact.normalize('NFD'))) failures.push('repeated-accents');
	if (isOffensiveName(value)) failures.push('offensive');
	if (!isPronounceable(value)) failures.push('pronounceability');
	return failures;
}

function choose<T>(items: readonly T[], random: () => number): T {
	return items[Math.floor(random() * items.length)];
}

export function generateBrandNamesWithStats(options: BrandNameOptions): BrandNameGenerationReport {
	const random = createSeededRandom(options.seed);
	const count = Math.min(100, Math.max(1, options.count ?? 24));
	const keywords = options.keywords.map((keyword) => keyword.trim()).filter(Boolean).slice(0, 5);
	const roots = keywords.length ? keywords : [...industryWords[options.industry]];
	const words = [...new Set([...industryWords[options.industry], ...styleWords[options.style]])];
	const results: string[] = [];
	const seen = new Set<string>();
	const filterFailures: Record<string, number> = {};
	const startingLetter = options.startingLetter?.trim().slice(0, 1) ?? '';
	const attempts = Math.max(3000, count * 500);
	let candidatesChecked = 0;

	for (let attempt = 0; attempt < attempts && results.length < count; attempt += 1) {
		const root = choose(roots, random);
		const word = choose(words, random);
		const prefix = choose(namePrefixes, random);
		const suffix = choose(nameSuffixes, random);
		const other = choose(roots, random);
		const pattern = namePatterns[Math.floor(random() * namePatterns.length)];
		const invented = choose(SYLLABLES, random) + choose(SYLLABLES, random);
		let candidate: string;
		switch (pattern) {
			case '{keyword} {word}':
				candidate = `${root} ${word}`;
				break;
			case '{word} {keyword}':
				candidate = `${word} ${root}`;
				break;
			case '{keyword}{word}':
				candidate = `${accentStripped(root)}${accentStripped(word)}`;
				break;
			case '{prefix}{keyword}':
				candidate = `${prefix}${accentStripped(root)}`;
				break;
			case '{keyword}{suffix}':
				candidate = `${accentStripped(root)}${suffix}`;
				break;
			case '{blend}':
				candidate = blend(root, other);
				break;
			default:
				candidate = invented;
		}
		candidate = sanitizeGeneratedText(candidate);
		if (startingLetter && !candidate.toLocaleLowerCase().startsWith(startingLetter.toLocaleLowerCase())) {
			candidate = `${startingLetter}${candidate}`;
		}
		candidatesChecked += 1;
		const failures = getNameFilterFailures(candidate, options.length);
		if (failures.length > 0) {
			for (const failure of failures) filterFailures[failure] = (filterFailures[failure] ?? 0) + 1;
			continue;
		}
		const key = candidate.normalize('NFKC').toLocaleLowerCase().replace(/\s+/g, ' ').trim();
		if (seen.has(key)) {
			filterFailures.duplicate = (filterFailures.duplicate ?? 0) + 1;
			continue;
		}
		seen.add(key);
		results.push(candidate);
	}
	return { names: results, filterFailures, candidatesChecked };
}

export function generateBrandNames(options: BrandNameOptions): string[] {
	return generateBrandNamesWithStats(options).names;
}
