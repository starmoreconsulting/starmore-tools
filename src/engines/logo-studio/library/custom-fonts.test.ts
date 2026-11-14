import { describe, expect, it } from 'vitest';
import { CUSTOM_FONT_MAX_BYTES, inspectCustomFont, WOFF2_MESSAGE } from './custom-fonts';

describe('inspectCustomFont', () => {
	it('rejects a file with an unsupported signature', async () => {
		const file = new Blob([new Uint8Array([0, 0, 0, 0])]);
		await expect(inspectCustomFont(file, 'font.ttf'))
			.rejects.toThrow('The font file signature is not a supported TTF, OTF or WOFF font.');
	});

	it('rejects a text file renamed with a TTF extension', async () => {
		const file = new Blob(['This is a text file, not a font.']);
		await expect(inspectCustomFont(file, 'renamed-font.ttf'))
			.rejects.toThrow('The font file signature is not a supported TTF, OTF or WOFF font.');
	});

	it('rejects WOFF2 with the friendly compatibility message', async () => {
		const file = new Blob([new Uint8Array([0x77, 0x4f, 0x46, 0x32])]);
		await expect(inspectCustomFont(file, 'font.woff2')).rejects.toThrow(WOFF2_MESSAGE);
	});

	it('rejects files over the 10 MB limit', async () => {
		const file = new Blob([new Uint8Array(CUSTOM_FONT_MAX_BYTES + 1)]);
		await expect(inspectCustomFont(file, 'font.ttf'))
			.rejects.toThrow('Font files must be 10 MB or smaller.');
	});
});
