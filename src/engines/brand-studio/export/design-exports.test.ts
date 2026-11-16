// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { deflateSync } from 'node:zlib';
import { strFromU8, unzipSync } from 'fflate';
import { createEmptyBrandKit } from '../../logo-studio/brand/kit';
import * as outline from '../../logo-studio/export/outline';
import * as raster from '../../logo-studio/export/raster';
import * as svg from '../../logo-studio/export/svg';
import { createDefaultElement, createDefaultProject } from '../../logo-studio/model/types';
import { exportBrandPack, exportDesignAsset, exportDesignAssetWithReport } from './design-exports';

function pngChunk(type: string, data: Buffer): Buffer {
	const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
	let crc = 0xffffffff;
	for (const byte of body) {
		crc ^= byte;
		for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
	}
	const length = Buffer.alloc(4);
	length.writeUInt32BE(data.length);
	const checksum = Buffer.alloc(4);
	checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
	return Buffer.concat([length, body, checksum]);
}

function transparentPixel(): Blob {
	const header = Buffer.alloc(13);
	header.writeUInt32BE(1, 0);
	header.writeUInt32BE(1, 4);
	header[8] = 8;
	header[9] = 6;
	const png = Buffer.concat([
		Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
		pngChunk('IHDR', header),
		pngChunk('IDAT', deflateSync(Buffer.from([0, 0, 0, 0, 0]))),
		pngChunk('IEND', Buffer.alloc(0)),
	]);
	return new Blob([png], { type: 'image/png' });
}

function emojiBusinessCard() {
	const project = createDefaultProject('Emoji business card');
	project.kind = 'design';
	project.artboard = { width: 85, height: 55, background: '#FFFFFF' };
	project.generation = {
		layoutId: 'business-card-front:centered',
		seed: 0,
		paletteName: 'Test',
		fontPair: { name: 'Test', primary: 'Inter', secondary: 'Inter' },
		icon: '',
	};
	project.variants.primary = [
		createDefaultElement('text', {
			text: 'Café Zoé 🌿 Studio',
			fieldName: 'businessName',
			fontFamily: 'Inter',
			x: 3,
			y: 3,
			width: 79,
			height: 20,
		}),
	];
	return project;
}

afterEach(() => vi.restoreAllMocks());

describe('exportBrandPack', () => {
	it('includes the validated brand kit and a README listing every archive file', async () => {
		const kit = createEmptyBrandKit('Pack test');
		const blob = await exportBrandPack(kit, []);
		const archive = unzipSync(new Uint8Array(await blob.arrayBuffer()));
		const paths = Object.keys(archive).sort();
		const readme = strFromU8(archive['README.txt']);

		expect(paths).toEqual(['Brand kit.json', 'README.txt']);
		expect(readme).toContain('- Brand kit.json');
		expect(readme).toContain('- README.txt');
	});

	it('rejects logo projects from the design asset exporter', async () => {
		await expect(exportDesignAsset(createDefaultProject(), 'svg'))
			.rejects.toThrow('Only Brand Studio designs can be exported here.');
	});

	it('uses a bounded raster fallback and preserves business-card print size when outlining fails', async () => {
		const render = vi.spyOn(raster, 'renderSvgToRaster').mockResolvedValue({
			blob: transparentPixel(),
			width: 1,
			height: 1,
		});
		vi.spyOn(svg, 'exportProjectToSvg').mockResolvedValue({
			svg: '<svg xmlns="http://www.w3.org/2000/svg" width="85" height="55"><text>🌿</text></svg>',
			warnings: ['No bundled font contains every character in “Café Zoé 🌿 Studio”.'],
		});
		vi.spyOn(outline, 'findUnbundledCharacters').mockResolvedValue(['🌿']);

		const result = await exportDesignAssetWithReport(emojiBusinessCard(), 'pdf');

		expect(render).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
			format: 'png',
			scale: expect.any(Number),
		}));
		expect(result.notice).toMatchObject({
			type: 'raster-pdf',
			unbundledCharacters: ['🌿'],
		});
		expect(result.notice?.effectiveDpi).toBeGreaterThanOrEqual(599);
		const document = await PDFDocument.load(await result.blob.arrayBuffer());
		const page = document.getPage(0);
		expect(page.getWidth()).toBeCloseTo(103 * 72 / 25.4);
		expect(page.getHeight()).toBeCloseTo(73 * 72 / 25.4);
	});
});
