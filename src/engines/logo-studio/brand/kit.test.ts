// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { createDefaultElement, createDefaultProject } from '../model/types';
import { applyBrandKitUpdates, BRAND_KIT_MAX_BYTES, exportKit, importKit, type BrandKit } from './kit';

function makeKit(overrides: Partial<BrandKit> = {}): BrandKit {
	return {
		starmore_brand_kit: 1,
		id: 'kit-test',
		name: 'Test brand',
		createdAt: 1,
		updatedAt: 2,
		colors: [{ name: 'Primary', hex: '#123456' }],
		fonts: { heading: 'Inter', subheading: 'Inter', body: 'Inter' },
		...overrides,
	};
}

function jsonFile(value: unknown, name = 'brand-kit.json'): File {
	return new File([JSON.stringify(value)], name, { type: 'application/json' });
}

describe('importKit', () => {
	it('continues to import kits without profiles or colour roles', async () => {
		const imported = await importKit(jsonFile(makeKit()));

		expect(imported.profile).toBeUndefined();
		expect(imported.colors[0]).toEqual({ name: 'Primary', hex: '#123456' });
	});

	it('imports profile data and assigned colour roles', async () => {
		const profile = {
			businessName: 'Example Co',
			tagline: 'Made locally',
			contactName: 'Ada Lovelace',
			jobTitle: 'Founder',
			phone: '+1 555 0100',
			email: 'ada@example.com',
			website: 'https://example.com',
			address: '1 Main Street\nLondon',
			socialHandles: { instagram: '@example', facebook: '', linkedin: '', youtube: '', x: '' },
		};
		const kit = makeKit({
			profile,
			colors: [{ name: 'Primary', hex: '#123456', role: 'primary' }],
		});
		const imported = await importKit(jsonFile(kit));

		expect(imported.profile).toEqual(profile);
		expect(imported.colors[0].role).toBe('primary');
	});

	it('validates email and URL formats without network checks', async () => {
		const profile = {
			businessName: '', tagline: '', contactName: '', jobTitle: '', phone: '', email: 'not-an-email',
			website: '', address: '', socialHandles: { instagram: '', facebook: '', linkedin: '', youtube: '', x: '' },
		};
		await expect(importKit(jsonFile(makeKit({ profile }))))
			.rejects.toThrow('Enter a valid email address or leave it blank.');
		await expect(importKit(jsonFile(makeKit({
			profile: { ...profile, email: '', website: 'javascript:alert(1)' },
		})))).rejects.toThrow('Enter a valid website URL beginning with http:// or https://, or leave it blank.');
	});

	it('rejects a non-JSON file', async () => {
		await expect(importKit(new File(['{}'], 'brand-kit.txt', { type: 'text/plain' })))
			.rejects.toThrow('Choose a Starmore brand kit in JSON format.');
	});

	it('rejects malformed JSON content', async () => {
		await expect(importKit(new File(['not json'], 'brand-kit.json', { type: 'application/json' })))
			.rejects.toThrow('This brand kit is not valid JSON.');
	});

	it('rejects files over the 10 MB limit', async () => {
		const file = new File([new Uint8Array(BRAND_KIT_MAX_BYTES + 1)], 'brand-kit.json', { type: 'application/json' });
		await expect(importKit(file)).rejects.toThrow('Brand kit files must be 10 MB or smaller.');
	});

	it('rejects a newer brand-kit version', async () => {
		await expect(importKit(jsonFile({ ...makeKit(), starmore_brand_kit: 2 })))
			.rejects.toThrow('This brand kit was created with a newer version. Update the app to import it.');
	});

	it('rejects more than 20 colours', async () => {
		const colors = Array.from({ length: 21 }, (_, index) => ({ name: `Colour ${index}`, hex: '#123456' }));
		await expect(importKit(jsonFile(makeKit({ colors }))))
			.rejects.toThrow('A brand kit can contain at most 20 colours.');
	});

	it('rejects invalid HEX colours', async () => {
		await expect(importKit(jsonFile(makeKit({ colors: [{ name: 'Primary', hex: '#12GG56' }] }))))
			.rejects.toThrow('The brand colour “Primary” must use a six-digit HEX value.');
	});

	it('rejects embedded files with a disallowed MIME type', async () => {
		const customFonts = [{
			family: 'Example',
			filename: 'example.ttf',
			mime: 'text/plain',
			dataUri: 'data:text/plain;base64,QQ==',
		}];
		await expect(importKit(jsonFile(makeKit({ customFonts }))))
			.rejects.toThrow('The custom font “Example” has an unsupported MIME type.');
	});

	it('sanitises script tags and event attributes in embedded SVGs', async () => {
		const project = createDefaultProject('SVG logo');
		const svg = '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><script>alert(1)</script><circle cx="2" cy="2" r="1"/></svg>';
		project.variants.primary = [
			createDefaultElement('image', { src: `data:image/svg+xml,${encodeURIComponent(svg)}` }),
		];
		const imported = await importKit(jsonFile(makeKit({ logo: project })));
		const source = imported.logo?.variants.primary[0].src ?? '';
		const sanitised = decodeURIComponent(source.slice(source.indexOf(',') + 1));

		expect(sanitised).not.toMatch(/<script\b/i);
		expect(sanitised).not.toMatch(/\bonload\s*=/i);
	});

	it('round-trips an exported brand kit', async () => {
		const original = makeKit();
		const exported = exportKit(original);
		const imported = await importKit(new File([exported.blob], 'brand-kit.json', { type: 'application/json' }));

		expect(imported).toEqual(original);
	});

	it('imports old version-one kits without a strategy block', async () => {
		const imported = await importKit(jsonFile(makeKit()));
		expect(imported.starmore_brand_kit).toBe(1);
		expect(imported.strategy).toBeUndefined();
	});

	it('round-trips validated strategy fields without changing kit version', async () => {
		const strategy = {
			positioning: 'A clear local choice',
			personality: ['warm', 'curious'],
			tone: ['plain', 'friendly'],
			mission: 'Make useful things.',
			vision: 'Help more neighbours thrive.',
		};
		const original = makeKit({ strategy });
		const imported = await importKit(new File([exportKit(original).blob], 'kit.json', { type: 'application/json' }));
		expect(imported.starmore_brand_kit).toBe(1);
		expect(imported.strategy).toEqual(strategy);
	});

	it('rejects invalid strategy types, text lengths, and more than 12 items', async () => {
		const strategy = { positioning: '', personality: [], tone: [], mission: '', vision: '' };
		await expect(importKit(jsonFile({ ...makeKit(), strategy: { ...strategy, mission: 42 } })))
			.rejects.toThrow('The brand strategy has an invalid mission; text must be 1,000 characters or fewer.');
		await expect(importKit(jsonFile({ ...makeKit(), strategy: { ...strategy, vision: 'v'.repeat(1001) } })))
			.rejects.toThrow('The brand strategy has an invalid vision; text must be 1,000 characters or fewer.');
		await expect(importKit(jsonFile({ ...makeKit(), strategy: { ...strategy, tone: Array(13).fill('clear') } })))
			.rejects.toThrow('The brand strategy tone must contain at most 12 items.');
	});

	it('updates only fields produced by the selected tool', () => {
		const kit = makeKit({
			profile: {
				businessName: 'Existing Co', tagline: 'Old line', contactName: '', jobTitle: '', phone: '',
				email: '', website: '', address: '', socialHandles: { instagram: '@old', facebook: '', linkedin: '', youtube: '', x: '' },
			},
			strategy: { positioning: 'Existing position', personality: ['warm'], tone: ['clear'], mission: '', vision: '' },
		});
		const updated = applyBrandKitUpdates(kit, { profile: { tagline: 'New line' } });
		expect(updated.profile?.tagline).toBe('New line');
		expect(updated.profile?.businessName).toBe('Existing Co');
		expect(updated.profile?.socialHandles.instagram).toBe('@old');
		expect(updated.strategy).toEqual(kit.strategy);
	});
});
