import { knownSlogans } from '../../../data/brand/blocklist-slogans';
import { sloganPatterns } from '../../../data/brand/slogan-patterns';
import { toneWords } from '../../../data/brand/tone-words';
import { createSeededRandom, seededShuffle } from './random';

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

export function generateBrandSlogans(options: BrandSloganOptions): string[] {
	const business = options.businessName.trim().slice(0, 100);
	const action = options.whatYouDo.trim().replace(/[.!?]+$/g, '').slice(0, 100) || 'make useful things';
	const audience = options.whoYouServe.trim().slice(0, 100) || 'your everyday';
	const benefit = options.benefit.trim().replace(/[.!?]+$/g, '').slice(0, 100) || 'more ease';
	const words = toneWords[options.tone];
	const patterns = seededShuffle(sloganPatterns, options.seed);
	const random = createSeededRandom(options.seed ^ 0xa5a5a5a5);
	const results: string[] = [];
	const seen = new Set<string>();
	const count = Math.min(20, Math.max(1, options.count ?? 20));
	for (let attempt = 0; attempt < 1600 && results.length < count; attempt += 1) {
		const pattern = patterns[attempt % patterns.length];
		const toneWord = words[Math.floor(random() * words.length)];
		const candidate = pattern.replace(/\{(business|action|audience|benefit|toneWord)\}/g, (_match, slot: string) => ({
			business: business || 'Good work',
			action,
			audience,
			benefit,
			toneWord,
		})[slot as 'business' | 'action' | 'audience' | 'benefit' | 'toneWord']).trim();
		if (/\{[^}]+\}/.test(candidate) || candidate.length > 120 || isKnownSloganMatch(candidate)) continue;
		const key = normalized(candidate);
		if (!key || seen.has(key)) continue;
		seen.add(key);
		results.push(candidate);
	}
	return results;
}
