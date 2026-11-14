// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { createDefaultElement, createDefaultProject } from '../model/types';
import { BRAND_KIT_MAX_BYTES, exportKit, importKit, type BrandKit } from './kit';

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
});
