import type { LogoIndustry, LogoStyle } from '../model/types';
import type { FontPair } from './layouts/types';

export interface IndustryRule {
	icons: string[];
}

export interface StyleRule {
	fontPairs: FontPair[];
	palettes: string[];
	layouts: string[];
	weights: number[];
	letterSpacing: number[];
}

export const industryRules: Record<LogoIndustry, IndustryRule> = {
	Technology: { icons: ['cpu', 'layers', 'rocket', 'code-xml', 'server', 'blocks', 'network', 'workflow'] },
	Business: { icons: ['briefcase-business', 'building', 'chart-no-axes-combined', 'handshake', 'landmark', 'badge-dollar-sign', 'gem', 'users-round'] },
	Fashion: { icons: ['shirt', 'scissors', 'sparkles', 'flower-2', 'crown', 'shopping-bag', 'store', 'tag'] },
	Construction: { icons: ['hard-hat', 'construction', 'hammer', 'ruler', 'wrench', 'brick-wall', 'house', 'building'] },
	Food: { icons: ['utensils', 'chef-hat', 'coffee', 'pizza', 'apple', 'croissant', 'flower-2', 'sprout'] },
	Transport: { icons: ['bike', 'bus', 'train-front', 'truck', 'plane', 'ship', 'map-pin', 'route'] },
	Education: { icons: ['book-open', 'graduation-cap', 'school', 'lightbulb', 'pencil', 'notebook-pen', 'globe', 'star'] },
	Health: { icons: ['heart-pulse', 'stethoscope', 'shield-plus', 'activity', 'leaf', 'sprout', 'cross', 'sparkles'] },
	Creative: { icons: ['palette', 'camera', 'pen-tool', 'brush', 'clapperboard', 'sparkles', 'flower-2', 'star'] },
	General: { icons: ['sparkles', 'circle-dot', 'square', 'hexagon', 'star', 'compass', 'globe', 'mountain'] },
};

const sans: FontPair[] = [
	{ name: 'Modern sans', primary: 'Inter', secondary: 'DM Sans' },
	{ name: 'Clean geometric', primary: 'Montserrat', secondary: 'Open Sans' },
	{ name: 'Friendly sans', primary: 'Manrope', secondary: 'Nunito' },
];
const serif: FontPair[] = [
	{ name: 'Classic serif', primary: 'Playfair Display', secondary: 'Inter' },
	{ name: 'Editorial serif', primary: 'Cormorant Garamond', secondary: 'Montserrat' },
	{ name: 'Formal serif', primary: 'Libre Baskerville', secondary: 'DM Sans' },
];
const display: FontPair[] = [
	{ name: 'Bold display', primary: 'Bebas Neue', secondary: 'Inter' },
	{ name: 'Strong geometric', primary: 'Righteous', secondary: 'Manrope' },
	{ name: 'Statement display', primary: 'Archivo Black', secondary: 'Open Sans' },
];
const script: FontPair[] = [
	{ name: 'Elegant script', primary: 'Great Vibes', secondary: 'Montserrat' },
	{ name: 'Warm script', primary: 'Pacifico', secondary: 'DM Sans' },
	{ name: 'Soft script', primary: 'Allura', secondary: 'Inter' },
];
const rounded: FontPair[] = [
	{ name: 'Playful rounded', primary: 'Nunito', secondary: 'Quicksand' },
	{ name: 'Soft modern', primary: 'Quicksand', secondary: 'Nunito' },
];
const condensed: FontPair[] = [
	{ name: 'Condensed modern', primary: 'Oswald', secondary: 'Open Sans' },
	{ name: 'Compact editorial', primary: 'Roboto Condensed', secondary: 'Lora' },
	{ name: 'Tall sans', primary: 'Barlow Condensed', secondary: 'DM Sans' },
];

const allLayouts = ['stacked-icon-name', 'horizontal-icon-name', 'text-only', 'monogram-circle', 'monogram-square', 'badge-emblem', 'underline-wordmark', 'two-line-wordmark', 'icon-shape-name', 'initial-name'];
const textLayouts = ['text-only', 'underline-wordmark', 'two-line-wordmark', 'initial-name'];
const badgeLayouts = ['badge-emblem', 'monogram-circle', 'monogram-square'];

export const styleRules: Record<LogoStyle, StyleRule> = {
	Minimalist: { fontPairs: [sans[0], sans[1], condensed[0]], palettes: ['Black and white', 'Blue and silver', 'Green and white'], layouts: [...textLayouts, 'stacked-icon-name', 'icon-shape-name'], weights: [400, 500, 600], letterSpacing: [0, 1, 2] },
	Modern: { fontPairs: [sans[0], sans[1], sans[2]], palettes: ['Blue and silver', 'Black and white', 'Green and white', 'Pastels'], layouts: allLayouts, weights: [500, 600, 700], letterSpacing: [0, 0.5, 1] },
	Corporate: { fontPairs: [sans[0], sans[1], condensed[1]], palettes: ['Blue and silver', 'Black and white', 'Navy and gold'], layouts: ['horizontal-icon-name', 'icon-shape-name', 'text-only', 'initial-name'], weights: [600, 700], letterSpacing: [0, 0.5, 1] },
	Luxury: { fontPairs: [serif[0], serif[1], script[0]], palettes: ['Gold and black', 'Navy and gold', 'Black and white'], layouts: [...badgeLayouts, 'text-only', 'underline-wordmark', 'stacked-icon-name'], weights: [400, 500, 600], letterSpacing: [1, 2, 3] },
	Futuristic: { fontPairs: [sans[1], condensed[0], display[1]], palettes: ['Blue and silver', 'Black and white', 'Navy and gold'], layouts: ['horizontal-icon-name', 'icon-shape-name', 'initial-name', 'stacked-icon-name'], weights: [600, 700, 800], letterSpacing: [1, 2, 3] },
	Geometric: { fontPairs: [sans[1], display[1], sans[2]], palettes: ['Blue and silver', 'Green and white', 'Pastels'], layouts: ['monogram-circle', 'monogram-square', 'badge-emblem', 'icon-shape-name', 'stacked-icon-name'], weights: [500, 600, 700], letterSpacing: [0, 1, 2] },
	Vintage: { fontPairs: [serif[2], script[1], serif[1]], palettes: ['Earth tones', 'Red and black', 'Gold and black'], layouts: ['badge-emblem', 'monogram-circle', 'underline-wordmark', 'stacked-icon-name'], weights: [400, 500, 700], letterSpacing: [0, 1, 2] },
	Elegant: { fontPairs: [serif[0], serif[1], script[2]], palettes: ['Navy and gold', 'Gold and black', 'Earth tones'], layouts: [...badgeLayouts, 'text-only', 'underline-wordmark'], weights: [400, 500, 600], letterSpacing: [1, 2, 3] },
	Bold: { fontPairs: [display[0], display[2], sans[1]], palettes: ['Red and black', 'Black and white', 'Blue and silver'], layouts: ['stacked-icon-name', 'horizontal-icon-name', 'initial-name', 'monogram-square', 'two-line-wordmark'], weights: [700, 800, 900], letterSpacing: [0, 0.5, 1] },
	Abstract: { fontPairs: [display[1], sans[0], serif[1]], palettes: ['Pastels', 'Red and black', 'Blue and silver'], layouts: ['badge-emblem', 'icon-shape-name', 'initial-name', 'stacked-icon-name'], weights: [500, 600, 700], letterSpacing: [0, 1, 2] },
	Playful: { fontPairs: [rounded[0], rounded[1], script[1]], palettes: ['Pastels', 'Green and white', 'Red and black'], layouts: ['stacked-icon-name', 'monogram-circle', 'icon-shape-name', 'two-line-wordmark'], weights: [500, 600, 700], letterSpacing: [0, 0.5, 1] },
	Professional: { fontPairs: [sans[0], sans[2], serif[2]], palettes: ['Blue and silver', 'Black and white', 'Navy and gold', 'Green and white'], layouts: ['horizontal-icon-name', 'text-only', 'initial-name', 'underline-wordmark', 'stacked-icon-name'], weights: [500, 600, 700], letterSpacing: [0, 0.5, 1] },
};
