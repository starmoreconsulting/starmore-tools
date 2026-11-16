// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { exportPrintPdf } from './print';
import { deflateSync } from 'node:zlib';

function pngChunk(type: string, data: Buffer): Buffer {
	const header = Buffer.from(type, 'ascii');
	const body = Buffer.concat([header, data]);
	let crc = 0xffffffff;
	for (const byte of body) {
		crc ^= byte;
		for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
	}
	const checksum = Buffer.alloc(4);
	checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
	const length = Buffer.alloc(4);
	length.writeUInt32BE(data.length);
	return Buffer.concat([length, body, checksum]);
}

function transparentPixelDataUrl(): string {
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
	return `data:image/png;base64,${png.toString('base64')}`;
}

describe('exportPrintPdf', () => {
	it('keeps 85 × 55 mm trim plus 3 mm bleed and crop-mark margin with a raster fallback', async () => {
		const result = await exportPrintPdf([{
			svg: '',
			rasterDataUrl: transparentPixelDataUrl(),
			width: 85,
			height: 55,
			unit: 'mm',
		}], { preset: 'standard', extendBackgroundColourIntoBleed: true });

		expect(result.pageSizes[0].widthPt).toBeCloseTo((85 + 6 + 12) * 72 / 25.4);
		expect(result.pageSizes[0].heightPt).toBeCloseTo((55 + 6 + 12) * 72 / 25.4);
		expect(result.blob.type).toBe('application/pdf');
		expect(result.blob.size).toBeGreaterThan(0);
		const document = await PDFDocument.load(await result.blob.arrayBuffer());
		const page = document.getPage(0);
		expect(page.getWidth()).toBeCloseTo((85 + 6 + 12) * 72 / 25.4);
		expect(page.getHeight()).toBeCloseTo((55 + 6 + 12) * 72 / 25.4);
	});

	it.each([
		['A4 letterhead', 210, 297, 228, 315],
		['DL envelope', 220, 110, 238, 128],
	])('exports a %s page at trim plus bleed and crop-mark margins', async (_label, width, height, finalWidth, finalHeight) => {
		const result = await exportPrintPdf([{
			svg: '',
			rasterDataUrl: transparentPixelDataUrl(),
			width,
			height,
			unit: 'mm',
		}], { preset: 'standard', extendBackgroundColourIntoBleed: true });

		expect(result.pageSizes[0].widthPt).toBeCloseTo(finalWidth * 72 / 25.4);
		expect(result.pageSizes[0].heightPt).toBeCloseTo(finalHeight * 72 / 25.4);
		const document = await PDFDocument.load(await result.blob.arrayBuffer());
		const page = document.getPage(0);
		expect(page.getWidth()).toBeCloseTo(finalWidth * 72 / 25.4);
		expect(page.getHeight()).toBeCloseTo(finalHeight * 72 / 25.4);
	});

	it('rejects a raster fallback that is not a PNG data URL', async () => {
		await expect(exportPrintPdf([{
			svg: '',
			rasterDataUrl: 'data:image/jpeg;base64,AA==',
			width: 85,
			height: 55,
			unit: 'mm',
		}])).rejects.toThrow('A print page raster fallback must be a PNG data URL.');
	});
});
