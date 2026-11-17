import { knownSlogans } from '../../../data/brand/blocklist-slogans';
import { sloganPatterns, type SloganPattern, type SloganSlot, type SloganSlotForm } from '../../../data/brand/slogan-patterns';
import { toneWords } from '../../../data/brand/tone-words';
import { createSeededRandom, seededShuffle } from './random';
import { isCleanGeneratedText, sanitizeGeneratedText } from './sanitize';

export type BrandTone = keyof typeof toneWords;

export interface BrandSloganOptions {
	businessName: string;
	whatYouDo: string;
	whoYouServe: string;
	benefit: string;
	tone: BrandTone;
	seed: number;
	count?: number;
}

export interface BrandSloganGenerationReport {
	slogans: string[];
	filterFailures: Record<string, number>;
	candidatesChecked: number;
}

type SloganSlots = Record<SloganSlot, string>;

const COMMON_VERBS = new Set([
	'add', 'build', 'create', 'deliver', 'design', 'find', 'get', 'give', 'grow', 'help', 'improve',
	'learn', 'make', 'move', 'save', 'sell', 'share', 'support', 'take', 'use', 'write',
]);
const IRREGULAR_PLURALS = new Set(['people', 'children', 'women', 'men', 'families', 'teams', 'staff']);

function normalized(value: string): string {
	return value.normalize('NFKD').replace(/\p{M}/gu, '').toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

function editSimilarity(first: string, second: string): number {
	const a = normalized(first);
	const b = normalized(second);
	if (!a || !b) return 0;
	const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
	for (let row = 1; row <= a.length; row += 1) {
		let diagonal = previous[0];
		previous[0] = row;
		for (let column = 1; column <= b.length; column += 1) {
			const above = previous[column];
			previous[column] = Math.min(
				previous[column] + 1,
				previous[column - 1] + 1,
				diagonal + (a[row - 1] === b[column - 1] ? 0 : 1),
			);
			diagonal = above;
		}
	}
	return 1 - previous[b.length] / Math.max(a.length, b.length);
}

export function isKnownSloganMatch(value: string): boolean {
	const candidate = normalized(value);
	return knownSlogans.some((known) => {
		const reference = normalized(known);
		return candidate === reference || editSimilarity(candidate, reference) >= 0.72;
	});
}

function fitsForm(value: string, form: SloganSlotForm, tone: BrandTone): boolean {
	const text = value.trim();
	const firstWord = text.split(/\s+/)[0]?.replace(/[^\p{L}'-]/gu, '') ?? '';
	if (!text) return false;
	switch (form) {
		case 'nonempty':
			return true;
		case 'adjective':
			return (toneWords[tone] as readonly string[]).includes(text);
		case 'nounPhrase':
			return text.split(/\s+/).length <= 5 && !COMMON_VERBS.has(firstWord.toLocaleLowerCase());
		case 'pluralGroup': {
			const lastWord = text.split(/\s+/).at(-1)?.toLocaleLowerCase() ?? '';
			return (lastWord.endsWith('s') && !lastWord.endsWith('ss')) || IRREGULAR_PLURALS.has(lastWord);
		}
		case 'thirdPersonVerb':
			return /^[\p{L}][\p{L}'-]*s(?:\s|$)/iu.test(text) && !/ss(?:\s|$)/iu.test(text);
		case 'infinitiveVerb':
			return /^[\p{L}][\p{L}'-]*(?:\s|$)/u.test(text)
				&& !/s$/iu.test(firstWord)
				&& COMMON_VERBS.has(firstWord.toLocaleLowerCase());
	}
}

function patternFits(pattern: SloganPattern, slots: SloganSlots, tone: BrandTone): boolean {
	return Object.entries(pattern.accepts).every(([slot, form]) =>
		fitsForm(slots[slot as SloganSlot], form!, tone));
}

function slotCapitalizationFits(pattern: SloganPattern, slots: SloganSlots): boolean {
	for (const [slot, value] of Object.entries(slots) as [SloganSlot, string][]) {
		if (!value || !new RegExp(`\\{${slot}\\}`).test(pattern.template)) continue;
		const index = pattern.template.indexOf(`{${slot}}`);
		if (index > 0 && /^\p{Lu}/u.test(value)) return false;
	}
	return true;
}

export function getSloganQualityFailures(
	value: string,
	userInput: readonly string[] = [],
	pattern?: SloganPattern,
	slots?: SloganSlots,
): string[] {
	const failures: string[] = [];
	const words = value.match(/[\p{L}\p{N}'-]+/gu) ?? [];
	const normalizedWords = words.map((word) => normalized(word));
	if (words.length < 3 || words.length > 9) failures.push('word-count');
	if (new Set(normalizedWords).size !== normalizedWords.length) failures.push('repeated-word');
	if ((value.match(/,/g) ?? []).length > 1) failures.push('comma-count');
	if (/\{[^}]+\}/.test(value)) failures.push('unfilled-slot');
	if (!isCleanGeneratedText(value, userInput)) failures.push('unclean-output');
	if (pattern && slots && !slotCapitalizationFits(pattern, slots)) failures.push('capitalized-slot-in-middle');
	return failures;
}

export function generateBrandSlogansWithStats(options: BrandSloganOptions): BrandSloganGenerationReport {
	const slots: SloganSlots = {
		business: options.businessName.trim().slice(0, 100),
		action: sanitizeGeneratedText(options.whatYouDo.trim().replace(/[.!?]+$/g, '').slice(0, 100)),
		audience: sanitizeGeneratedText(options.whoYouServe.trim().slice(0, 100)),
		benefit: sanitizeGeneratedText(options.benefit.trim().replace(/[.!?]+$/g, '').slice(0, 100)),
		toneWord: '',
	};
	const patterns = seededShuffle(sloganPatterns, options.seed);
	const random = createSeededRandom(options.seed ^ 0xa5a5a5a5);
	const results: string[] = [];
	const seen = new Set<string>();
	const count = Math.min(60, Math.max(1, options.count ?? 20));
	const maxAttempts = Math.max(600, count * patterns.length * 20);
	const filterFailures: Record<string, number> = {};
	let candidatesChecked = 0;
	const recordFailure = (failure: string) => {
		filterFailures[failure] = (filterFailures[failure] ?? 0) + 1;
	};

	for (let attempt = 0; attempt < maxAttempts && results.length < count; attempt += 1) {
		const pattern = patterns[attempt % patterns.length];
		const toneWordList = toneWords[options.tone];
		slots.toneWord = toneWordList[Math.floor(random() * toneWordList.length)];
		candidatesChecked += 1;
		if (!patternFits(pattern, slots, options.tone)) {
			recordFailure('slot-form');
			continue;
		}
		if (!slotCapitalizationFits(pattern, slots)) {
			recordFailure('capitalized-slot-in-middle');
			continue;
		}
		const candidate = sanitizeGeneratedText(pattern.template.replace(/\{(business|action|audience|benefit|toneWord)\}/g, (_match, slot: SloganSlot) => slots[slot]));
		const input = [slots.business, slots.action, slots.audience, slots.benefit].filter(Boolean);
		const failures = getSloganQualityFailures(candidate, input, pattern, slots);
		if (isKnownSloganMatch(candidate)) failures.push('known-slogan-match');
		if (failures.length > 0) {
			for (const failure of failures) recordFailure(failure);
			continue;
		}
		const key = normalized(candidate);
		if (!key) {
			recordFailure('empty');
			continue;
		}
		if (seen.has(key)) {
			recordFailure('duplicate');
			continue;
		}
		seen.add(key);
		results.push(candidate);
	}
	return { slogans: results, filterFailures, candidatesChecked };
}

export function generateBrandSlogans(options: BrandSloganOptions): string[] {
	return generateBrandSlogansWithStats(options).slogans;
}
