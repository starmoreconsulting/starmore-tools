import type { LogoIndustry, LogoStyle } from '../../engines/logo-studio/model/types';

export const industryWords: Record<LogoIndustry, string[]> = {
	Technology: ['signal', 'circuit', 'orbit', 'logic', 'pixel', 'vector', 'cloud', 'spark'],
	Business: ['summit', 'ledger', 'north', 'harbor', 'alliance', 'merit', 'cornerstone', 'keystone'],
	Fashion: ['atelier', 'thread', 'silhouette', 'woven', 'form', 'needle', 'linen', 'muse'],
	Construction: ['foundation', 'beam', 'forge', 'mason', 'structure', 'craft', 'ridge', 'frame'],
	Food: ['harvest', 'savor', 'table', 'grain', 'orchard', 'hearth', 'spoon', 'fresh'],
	Transport: ['route', 'trail', 'compass', 'fleet', 'motion', 'junction', 'path', 'voyage'],
	Education: ['bright', 'curious', 'learn', 'wisdom', 'chapter', 'discover', 'lesson', 'growth'],
	Health: ['well', 'renew', 'balance', 'bloom', 'care', 'vital', 'steady', 'whole'],
	Creative: ['canvas', 'studio', 'colour', 'shape', 'story', 'craft', 'vision', 'frame'],
	General: ['good', 'true', 'kind', 'common', 'open', 'local', 'bright', 'root'],
};

export const styleWords: Record<LogoStyle, string[]> = {
	Minimalist: ['form', 'line', 'pure', 'clear', 'still', 'plain'],
	Modern: ['nova', 'current', 'shift', 'next', 'mode', 'now'],
	Corporate: ['united', 'standard', 'group', 'partners', 'works', 'collective'],
	Luxury: ['maison', 'grand', 'golden', 'estate', 'noble', 'fine'],
	Futuristic: ['orbit', 'quantum', 'future', 'stellar', 'nexus', 'phase'],
	Geometric: ['vertex', 'angle', 'facet', 'axis', 'grid', 'plane'],
	Vintage: ['heritage', 'foundry', 'original', 'classic', 'legacy', 'oldfield'],
	Elegant: ['grace', 'elle', 'poise', 'lumi', 'flourish', 'silk'],
	Bold: ['brave', 'strong', 'bold', 'stand', 'mighty', 'forward'],
	Abstract: ['echo', 'form', 'wave', 'field', 'mosaic', 'frame'],
	Playful: ['kip', 'poppy', 'jolly', 'bouncy', 'wonder', 'wiggle'],
	Professional: ['trusted', 'clear', 'merit', 'steady', 'expert', 'first'],
};
