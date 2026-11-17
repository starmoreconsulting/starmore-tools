import { styleRules } from '../../logo-studio/templates/rules';
import type { LogoStyle } from '../../logo-studio/model/types';

export const personalityScales = [
	{ ends: ['Formal', 'Casual'], axis: 'formality' },
	{ ends: ['Playful', 'Serious'], axis: 'energy' },
	{ ends: ['Bold', 'Subtle'], axis: 'presence' },
	{ ends: ['Classic', 'Modern'], axis: 'era' },
	{ ends: ['Friendly', 'Reserved'], axis: 'warmth' },
] as const;

const TRAIT_STYLES: Record<string, LogoStyle> = {
	Formal: 'Professional', Casual: 'Playful',
	Playful: 'Playful', Serious: 'Corporate',
	Bold: 'Bold', Subtle: 'Minimalist',
	Classic: 'Vintage', Modern: 'Modern',
	Friendly: 'Modern', Reserved: 'Elegant',
};

const VOICE: Record<string, { note: string; do: string; dont: string }> = {
	Formal: { note: 'Use composed, precise language.', do: 'Use complete sentences and clear terms.', dont: 'Use slang or overly casual abbreviations.' },
	Casual: { note: 'Sound relaxed and conversational.', do: 'Use everyday words and a natural rhythm.', dont: 'Sound careless or overly familiar.' },
	Playful: { note: 'Add lightness while keeping meaning clear.', do: 'Use a little wit when it helps the message.', dont: 'Let jokes obscure important information.' },
	Serious: { note: 'Keep the voice focused and measured.', do: 'Lead with useful facts.', dont: 'Overstate claims or use needless exclamation.' },
	Bold: { note: 'Make confident points in direct language.', do: 'Choose active verbs and clear calls to action.', dont: 'Mistake confidence for guarantees.' },
	Subtle: { note: 'Let the message feel calm and considered.', do: 'Keep copy concise and understated.', dont: 'Use exaggerated claims or excessive emphasis.' },
	Classic: { note: 'Use enduring, familiar language.', do: 'Prefer clarity and established conventions.', dont: 'Chase every passing trend.' },
	Modern: { note: 'Keep language current and easy to scan.', do: 'Use direct wording and useful structure.', dont: 'Use jargon just to sound contemporary.' },
	Friendly: { note: 'Make the reader feel welcome and respected.', do: 'Use inclusive, helpful phrasing.', dont: 'Become overly familiar or patronizing.' },
	Reserved: { note: 'Use a measured, thoughtful voice.', do: 'Let evidence and care lead.', dont: 'Push urgency without a real reason.' },
};

export interface PersonalityResult {
	traits: string[];
	notes: string[];
	doList: string[];
	dontList: string[];
	styles: LogoStyle[];
	palettes: string[];
	fontCategories: string[];
}

export function buildPersonality(traits: string[]): PersonalityResult {
	const selected = [...new Set(traits)].slice(0, 5);
	const styles = [...new Set(selected.map((trait) => TRAIT_STYLES[trait]).filter((style): style is LogoStyle => Boolean(style)))];
	const palettes = [...new Set(styles.flatMap((style) => styleRules[style].palettes))];
	const fontCategories = [...new Set(styles.flatMap((style) => styleRules[style].fontPairs.map((pair) => {
		const family = pair.primary.toLowerCase();
		if (/serif|lora|playfair|baskerville|cormorant|bodoni|merriweather/.test(family)) return 'serif';
		if (/script|vibes|pacifico|allura|dancing/.test(family)) return 'script';
		if (/bebas|anton|archivo|righteous/.test(family)) return 'display';
		return 'sans';
	})))];
	return {
		traits: selected,
		notes: selected.map((trait) => VOICE[trait]?.note).filter((note): note is string => Boolean(note)),
		doList: selected.map((trait) => VOICE[trait]?.do).filter((note): note is string => Boolean(note)),
		dontList: selected.map((trait) => VOICE[trait]?.dont).filter((note): note is string => Boolean(note)),
		styles,
		palettes,
		fontCategories,
	};
}
