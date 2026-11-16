import { describe, expect, it } from 'vitest';
import { createEmptyBrandKit, type BrandProfile } from '../../logo-studio/brand/kit';
import { createDefaultElement, createDefaultProject } from '../../logo-studio/model/types';
import { chooseTextColor, generateDesign, getDesignLayouts } from './generate';

const profile: BrandProfile = {
	businessName: 'Élan Atelier ✨',
	tagline: 'Thoughtful work, made with care',
	contactName: 'Alexandria A. Verylongsurname Smithson-Williams',
	jobTitle: 'Founder and Creative Director',
	phone: '+1 555 0100',
	email: 'hello@example.com',
	website: 'https://example.com',
	address: '123 Long Avenue, Suite 200\nNorth District\nSpringfield\nUnited States',
	socialHandles: { instagram: '@atelier', facebook: '', linkedin: '@atelier', youtube: '', x: '' },
};

function kit() {
	const brand = createEmptyBrandKit('Elan Atelier');
	brand.colors = [
		{ name: 'Forest', hex: '#173B2E', role: 'primary' },
		{ name: 'Cream', hex: '#FFF8E8', role: 'light' },
		{ name: 'Gold', hex: '#E8C547', role: 'accent' },
	];
	brand.profile = profile;
	return brand;
}

function textElements(type: string, layout: string) {
	const generated = generateDesign(type as Parameters<typeof generateDesign>[0], layout, kit(), profile);
	return { generated, texts: generated.project.variants.primary.filter((element) => element.type === 'text') };
}

describe('brand design generation', () => {
	it('provides three layouts for each supported design type', () => {
		for (const type of [
			'business-card-front', 'business-card-back', 'letterhead', 'envelope',
			'instagram-post-square', 'instagram-post-portrait', 'instagram-story',
			'facebook-cover', 'youtube-banner', 'linkedin-banner',
		]) {
			expect(getDesignLayouts(type as Parameters<typeof getDesignLayouts>[0])).toHaveLength(3);
		}
	});

	it('uses the requested print sizes and keeps generated text outside the 3 mm trim margin', () => {
		for (const type of ['business-card-front', 'business-card-back', 'letterhead', 'envelope']) {
			for (const layout of getDesignLayouts(type as Parameters<typeof getDesignLayouts>[0])) {
				const { generated, texts } = textElements(type, layout);
				const { width, height } = generated.project.artboard;
				expect(texts.every((element) => element.x >= 3 && element.y >= 3
					&& element.x + element.width <= width - 3
					&& element.y + element.height <= height - 3)).toBe(true);
				expect(generated.project.artboard).toMatchObject(
					type === 'letterhead' ? { width: 210, height: 297 }
						: type === 'envelope' ? { width: 220, height: 110 }
							: { width: 85, height: 55 },
				);
			}
		}
	});

	it('supports the 3.5 by 2 inch card preset in millimetres', () => {
		const { project } = generateDesign('business-card-front', 'centered', kit(), profile, { cardSize: '3.5x2in' });
		expect(project.artboard).toMatchObject({ width: 88.9, height: 50.8 });
	});

	it('omits empty optional fields instead of creating placeholder text', () => {
		const sparse = { ...profile, tagline: '', contactName: '', jobTitle: '', phone: '', email: '', website: '', address: '', socialHandles: { instagram: '', facebook: '', linkedin: '', youtube: '', x: '' } };
		const { project } = generateDesign('business-card-back', 'editorial', kit(), sparse);
		const fields = project.variants.primary.filter((element) => element.type === 'text');
		expect(fields.map((element) => element.fieldName)).toEqual(['businessName']);
		expect(fields.some((element) => /your text|placeholder/i.test(element.text ?? ''))).toBe(false);
	});

	it('fits long names and multiline addresses into a business card back', () => {
		const generated = generateDesign('business-card-back', 'centered', kit(), profile);
		expect(generated.project.variants.primary.some((element) => element.fieldName === 'businessName')).toBe(true);
		expect(generated.warnings.filter((warning) => warning.includes('may overflow'))).toEqual([]);
	});

	it('fits an extreme profile within the print safe zone without overflow warnings', () => {
		const extreme = {
			...profile,
			businessName: `Élan Atelier ✨ ${'A'.repeat(60)}`,
			address: '12 Café Lane\nÉtage 2\nMünchen\nDeutschland',
		};
		for (const type of ['business-card-front', 'business-card-back', 'letterhead', 'envelope']) {
			const generated = generateDesign(type as Parameters<typeof generateDesign>[0], 'centered', kit(), extreme);
			const { width, height } = generated.project.artboard;
			const text = generated.project.variants.primary.filter((element) => element.type === 'text');
			expect(text.length, `${type} should include text`).toBeGreaterThan(0);
			expect(text.every((element) => element.x >= 3 && element.y >= 3
				&& element.x + element.width <= width - 3
				&& element.y + element.height <= height - 3), `${type} text should stay inside the 3 mm safe zone`).toBe(true);
			expect(generated.warnings.filter((warning) => warning.includes('may overflow')), type).toEqual([]);
			expect(text.some((element) => /✨/.test(element.text ?? '')), `${type} retains emoji as editable text`).toBe(true);
			if (type === 'business-card-back' || type === 'envelope') {
				expect(text.some((element) => (element.text ?? '').includes('Deutschland')), `${type} retains the multiline address`).toBe(true);
			}
		}
	});

	it.each([
		['very dark', '#111111'],
		['very light', '#F8F8F8'],
		['yellow', '#FFFF00'],
		['midtone', '#777777'],
	])('chooses readable contrast for %s backgrounds', (_label, background) => {
		expect(chooseTextColor(background).ratio).toBeGreaterThanOrEqual(4.5);
	});

	it('keeps text readable and warns when yellow primary has low contrast on white', () => {
		const yellowKit = kit();
		yellowKit.colors = yellowKit.colors.map((color) => (
			color.role === 'primary' ? { ...color, hex: '#FFFF00' } : color
		));
		const generated = generateDesign('business-card-front', 'bold-band', yellowKit, profile);
		const text = generated.project.variants.primary.filter((element) => element.type === 'text');

		expect(text.every((element) => element.fill === '#000000'
			&& chooseTextColor('#FFFF00').ratio >= 4.5)).toBe(true);
		expect(generated.warnings.some((warning) => warning.includes('primary brand colour has low contrast'))).toBe(true);
	});

	it('uses the white logo variant on dark backgrounds and the black variant on light backgrounds', () => {
		const brand = kit();
		const logo = createDefaultProject('Logo variants');
		logo.variants = {
			black: [createDefaultElement('shape', { role: 'icon', shape: 'ellipse', width: 80, height: 80, fill: '#111111' })],
			white: [createDefaultElement('shape', { role: 'icon', shape: 'ellipse', width: 80, height: 80, fill: '#FFFFFF' })],
		};
		brand.logo = logo;

		const dark = generateDesign('instagram-post-square', 'centered', brand, profile, { backgroundColor: '#111111' });
		const light = generateDesign('instagram-post-square', 'centered', brand, profile, { backgroundColor: '#F8F8F8' });
		expect(dark.project.variants.primary.find((element) => element.role === 'icon')?.fill).toBe('#FFFFFF');
		expect(light.project.variants.primary.find((element) => element.role === 'icon')?.fill).toBe('#111111');
	});

	it('keeps social text inside the central 60% safe area', () => {
		for (const type of [
			'instagram-post-square', 'instagram-post-portrait', 'instagram-story',
			'facebook-cover', 'youtube-banner', 'linkedin-banner',
		]) {
			for (const layout of getDesignLayouts(type as Parameters<typeof getDesignLayouts>[0])) {
				const { generated, texts } = textElements(type, layout);
				const { width, height } = generated.project.artboard;
				const margin = Math.min(width, height) * 0.2;
				expect(texts.every((element) => element.x >= margin && element.y >= margin
					&& element.x + element.width <= width - margin
					&& element.y + element.height <= height - margin), `${type}/${layout}: ${JSON.stringify(texts.map(({fieldName, x, y, width: itemWidth, height: itemHeight}) => ({fieldName, x, y, width: itemWidth, height: itemHeight})))}`).toBe(true);
			}
		}
	});
});
