import { describe, expect, it } from 'vitest';
import { readJpegExif, stripJpegExif, validateExifJpeg } from './exif-tool';

function makeSegment(marker: number, payload: Uint8Array): Uint8Array {
	const length = payload.length + 2;
	return new Uint8Array([0xff, marker, (length >> 8) & 0xff, length & 0xff, ...payload]);
}

function makeExifPayload(): Uint8Array {
	const tiff = new Uint8Array(44);
	const view = new DataView(tiff.buffer);
	tiff.set([0x49, 0x49], 0);
	view.setUint16(2, 42, true);
	view.setUint32(4, 8, true);
	view.setUint16(8, 2, true);
	view.setUint16(10, 0x010f, true);
	view.setUint16(12, 2, true);
	view.setUint32(14, 6, true);
	view.setUint32(18, 38, true);
	view.setUint16(22, 0x0112, true);
	view.setUint16(24, 3, true);
	view.setUint32(26, 1, true);
	view.setUint16(30, 1, true);
	tiff.set(new TextEncoder().encode('Canon\0'), 38);
	const payload = new Uint8Array(6 + tiff.length);
	payload.set(new Uint8Array([0x45, 0x78, 0x69, 0x66, 0, 0]));
	payload.set(tiff, 6);
	return payload;
}

function makeJpeg(includeExif = true): Uint8Array {
	const parts = [
		new Uint8Array([0xff, 0xd8]),
		makeSegment(0xe0, new Uint8Array([0x4a, 0x46])),
		makeSegment(0xe1, new TextEncoder().encode('http://ns.adobe.com/xap/1.0/\0xmp-data')),
	];
	if (includeExif) parts.push(makeSegment(0xe1, makeExifPayload()));
	parts.push(makeSegment(0xda, new Uint8Array([1, 1, 0, 0, 0x3f, 0])));
	parts.push(new Uint8Array([0x12, 0x34, 0xff, 0xd9]));
	const output = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
	let offset = 0;
	for (const part of parts) {
		output.set(part, offset);
		offset += part.length;
	}
	return output;
}

describe('EXIF JPEG utilities', () => {
	it('reads camera and orientation EXIF tags from JPEG', async () => {
		const tags = await readJpegExif(makeJpeg());
		expect(tags).toContainEqual({ name: 'Make', value: 'Canon' });
		expect(tags).toContainEqual({ name: 'Orientation', value: 'Horizontal (normal)' });
	});

	it('reports an empty result when the JPEG contains no EXIF tags', async () => {
		expect(await readJpegExif(makeJpeg(false))).toEqual([]);
	});

	it('removes EXIF APP1 segments while preserving XMP, other segments and image bytes', () => {
		const input = makeJpeg();
		const result = stripJpegExif(input);
		expect(result.removed).toBe(true);
		expect(new TextDecoder().decode(result.bytes)).not.toContain('Canon');
		expect(new TextDecoder().decode(result.bytes)).toContain('http://ns.adobe.com/xap/1.0/');
		expect([...result.bytes.slice(-4)]).toEqual([0x12, 0x34, 0xff, 0xd9]);
		expect(() => validateExifJpeg(result.bytes)).not.toThrow();
	});

	it('leaves a JPEG unchanged when it has no EXIF segment', () => {
		const input = makeJpeg(false);
		const result = stripJpegExif(input);
		expect(result.removed).toBe(false);
		expect(result.bytes).toEqual(input);
	});

	it('rejects non-JPEG and incomplete JPEG data', () => {
		expect(() => validateExifJpeg(new Uint8Array([1, 2, 3, 4]))).toThrow('Choose a JPEG/JPG image');
		expect(() => validateExifJpeg(new Uint8Array([0xff, 0xd8, 0xff, 0xe1, 0]))).toThrow('incomplete or damaged');
	});
});
