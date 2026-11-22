import { describe, expect, it } from 'vitest';
import { buildBoxShadowCss, hexToRgba } from './box-shadow';

describe('Box shadow engine', () => {
	it('builds standard and inset shadows', () => {
		expect(buildBoxShadowCss({ horizontal: 12, vertical: 8, blur: 24, spread: 4, color: '#000000', opacity: 25, inset: false }))
			.toBe('12px 8px 24px 4px rgba(0, 0, 0, 0.25)');
		expect(buildBoxShadowCss({ horizontal: -4, vertical: 3, blur: 10, spread: -2, color: '#ff0000', opacity: 100, inset: true }))
			.toBe('-4px 3px 10px -2px rgba(255, 0, 0, 1) inset');
	});

	it('converts hex colours to alpha-aware RGBA', () => {
		expect(hexToRgba('#22d3ee', 50)).toBe('rgba(34, 211, 238, 0.5)');
		expect(hexToRgba('#ffffff', 0)).toBe('rgba(255, 255, 255, 0)');
		expect(() => hexToRgba('red', 50)).toThrow('valid 6-digit');
	});

	it('clamps values outside supported ranges', () => {
		expect(buildBoxShadowCss({ horizontal: 150, vertical: -150, blur: -10, spread: 150, color: '#111111', opacity: 150, inset: false }))
			.toBe('100px -100px 0px 100px rgba(17, 17, 17, 1)');
		expect(buildBoxShadowCss({ horizontal: 0, vertical: 0, blur: 0, spread: 0, color: '#000000', opacity: -20, inset: false }))
			.toBe('0px 0px 0px 0px rgba(0, 0, 0, 0)');
	});
});
