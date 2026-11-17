import { logoFonts, type LogoFontCategory } from '../../engines/logo-studio/library/fonts';
import { createSeededRandom, seededShuffle } from '../../engines/brand-studio/strategy/random';

export interface BrandFontMeta {
	family: string;
	category: LogoFontCategory;
	moodTags: string[];
	availableWeights: number[];
	license: string;
}

export interface FontPairing {
	name: string;
	heading: string;
	subheading: string;
	body: string;
}

const CATEGORY_MOODS: Record<LogoFontCategory, string[]> = {
	sans: ['clear', 'versatile', 'modern'],
	serif: ['editorial', 'classic', 'considered'],
	display: ['expressive', 'bold', 'distinctive'],
	script: ['personal', 'expressive', 'elegant'],
	rounded: ['friendly', 'approachable', 'soft'],
	condensed: ['compact', 'energetic', 'direct'],
};

const EXTRA_MOODS: Record<string, string[]> = {
	'DM Serif Display': ['warm', 'literary'],
	'Great Vibes': ['ornamental', 'formal'],
	'Bebas Neue': ['sporty', 'urban'],
	'Nunito': ['gentle', 'welcoming'],
	'Libre Baskerville': ['trustworthy', 'traditional'],
	'Quicksand': ['playful', 'light'],
	'Roboto Condensed': ['efficient', 'technical'],
	'Dancing Script': ['handwritten', 'lively'],
};

const PACKAGE_LICENSES: Record<string, string> = {
	'Roboto Slab': 'Apache-2.0',
};

export const bundledBrandFonts: BrandFontMeta[] = logoFonts.map((font) => ({
	family: font.family,
	category: font.category,
	moodTags: [...CATEGORY_MOODS[font.category], ...(EXTRA_MOODS[font.family] ?? [])],
	availableWeights: font.regular === font.bold ? [400] : [400, 700],
	license: PACKAGE_LICENSES[font.family] ?? 'OFL-1.1',
}));

export const curatedFontPairings: FontPairing[] = [
	{ name: 'Editorial / clean / bold', heading: 'Playfair Display', subheading: 'Montserrat', body: 'Bebas Neue' },
	{ name: 'Classic / friendly / compact', heading: 'Cormorant Garamond', subheading: 'Nunito', body: 'Oswald' },
	{ name: 'Warm / expressive / neutral', heading: 'DM Serif Display', subheading: 'Pacifico', body: 'Inter' },
	{ name: 'Literary / geometric / clear', heading: 'Lora', subheading: 'Righteous', body: 'Work Sans' },
	{ name: 'Refined / soft / condensed', heading: 'Bodoni Moda', subheading: 'Quicksand', body: 'Roboto Condensed' },
	{ name: 'Trustworthy / personal / bold', heading: 'Libre Baskerville', subheading: 'Allura', body: 'Anton' },
	{ name: 'Structured / elegant / modern', heading: 'Roboto Slab', subheading: 'Dancing Script', body: 'Manrope' },
	{ name: 'Traditional / energetic / readable', heading: 'Merriweather', subheading: 'Barlow Condensed', body: 'Open Sans' },
	{ name: 'Poised / direct / approachable', heading: 'Playfair Display', subheading: 'Oswald', body: 'Nunito' },
	{ name: 'Contemporary / warm / bold', heading: 'DM Serif Display', subheading: 'Raleway', body: 'Anton' },
	{ name: 'Expressive / familiar / neutral', heading: 'Archivo Black', subheading: 'Great Vibes', body: 'Source Sans 3' },
	{ name: 'Soft / classic / technical', heading: 'Quicksand', subheading: 'Lora', body: 'Roboto Condensed' },
] as const;

export function getGeneratedFontPairings(seed: number, count = 18): FontPairing[] {
	const random = createSeededRandom(seed);
	const categories = [...new Set(bundledBrandFonts.map((font) => font.category))];
	const shuffled = seededShuffle(categories, seed);
	return Array.from({ length: count }, (_, index) => {
		const headingCategory = shuffled[index % shuffled.length];
		const remaining = shuffled.filter((category) => category !== headingCategory);
		const subheadingCategory = remaining[Math.floor(random() * remaining.length)];
		const bodyCategory = remaining.find((category) => category !== subheadingCategory) ?? headingCategory;
		const family = (category: LogoFontCategory, offset: number) => {
			const options = bundledBrandFonts.filter((font) => font.category === category);
			return options[(index + offset) % options.length].family;
		};
		let heading = family(headingCategory, 0);
		let subheading = family(subheadingCategory, 1);
		let body = family(bodyCategory, 2);
		if (new Set([heading, subheading, body]).size < 3) {
			const available = bundledBrandFonts.filter((font) => ![heading, subheading].includes(font.family));
			body = available[(index + 2) % available.length].family;
		}
		return { name: `Generated pairing ${index + 1}`, heading, subheading, body };
	});
}
