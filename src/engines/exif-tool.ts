import exifr from 'exifr';

export const EXIF_TOOL_MAX_FILE_BYTES = 50_000_000;

export interface ExifTag {
	name: string;
	value: string;
}

function assertJpeg(data: Uint8Array): void {
	if (data.length < 4 || data[0] !== 0xff || data[1] !== 0xd8) {
		throw new Error('Choose a JPEG/JPG image. This tool does not support other image formats.');
	}
}

function isStandaloneMarker(marker: number): boolean {
	return marker === 0x01 || marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7);
}

function processJpeg(data: Uint8Array, removeExif: boolean): { bytes: Uint8Array; removed: boolean } {
	assertJpeg(data);
	const parts: Uint8Array[] = [data.subarray(0, 2)];
	let cursor = 2;
	let removed = false;

	while (cursor < data.length) {
		const segmentStart = cursor;
		if (data[cursor] !== 0xff) throw new Error('This JPEG image has an invalid marker sequence.');
		while (cursor < data.length && data[cursor] === 0xff) cursor += 1;
		if (cursor >= data.length) throw new Error('This JPEG image is incomplete or damaged.');
		const marker = data[cursor];
		cursor += 1;

		if (marker === 0xda) {
			if (cursor + 2 > data.length) throw new Error('This JPEG image is incomplete or damaged.');
			const scanHeaderLength = (data[cursor] << 8) | data[cursor + 1];
			const scanDataStart = cursor + scanHeaderLength;
			if (scanHeaderLength < 2 || scanDataStart > data.length) {
				throw new Error('This JPEG image contains an invalid or incomplete scan header.');
			}
			let hasEndMarker = false;
			for (let index = scanDataStart; index < data.length - 1; index += 1) {
				if (data[index] === 0xff && data[index + 1] === 0xd9) {
					hasEndMarker = true;
					break;
				}
			}
			if (!hasEndMarker) throw new Error('This JPEG image is incomplete or damaged.');
			if (!removeExif) return { bytes: data, removed };
			parts.push(data.subarray(segmentStart));
			const totalLength = parts.reduce((total, part) => total + part.length, 0);
			const output = new Uint8Array(totalLength);
			let offset = 0;
			for (const part of parts) {
				output.set(part, offset);
				offset += part.length;
			}
			return { bytes: output, removed };
		}

		if (isStandaloneMarker(marker)) {
			if (marker === 0xd9) throw new Error('This JPEG image does not contain image data.');
			parts.push(data.subarray(segmentStart, cursor));
			continue;
		}

		if (cursor + 2 > data.length) throw new Error('This JPEG image is incomplete or damaged.');
		const segmentLength = (data[cursor] << 8) | data[cursor + 1];
		if (segmentLength < 2 || cursor + segmentLength > data.length) {
			throw new Error('This JPEG image contains an invalid or incomplete metadata segment.');
		}
		const segmentEnd = cursor + segmentLength;
		const payloadStart = cursor + 2;
		const isExifSegment = marker === 0xe1
			&& segmentLength >= 8
			&& data[payloadStart] === 0x45
			&& data[payloadStart + 1] === 0x78
			&& data[payloadStart + 2] === 0x69
			&& data[payloadStart + 3] === 0x66
			&& data[payloadStart + 4] === 0
			&& data[payloadStart + 5] === 0;

		if (removeExif && isExifSegment) removed = true;
		else parts.push(data.subarray(segmentStart, segmentEnd));
		cursor = segmentEnd;
	}

	throw new Error('This JPEG image is incomplete or damaged.');
}

export function validateExifJpeg(data: Uint8Array): void {
	processJpeg(data, false);
}

export function stripJpegExif(data: Uint8Array): { bytes: Uint8Array; removed: boolean } {
	return processJpeg(data, true);
}

function formatValue(value: unknown, depth = 0): string {
	if (typeof value === 'string') return value.length > 500 ? `${value.slice(0, 500)}…` : value;
	if (typeof value === 'number' || typeof value === 'bigint' || typeof value === 'boolean') return String(value);
	if (value === null || value === undefined) return '';
	if (value instanceof Date) return value.toISOString();
	if (value instanceof Uint8Array) return `${value.length.toLocaleString()} binary bytes`;
	if (depth >= 2) return 'Structured value';
	if (Array.isArray(value)) {
		const shown = value.slice(0, 20).map((item) => formatValue(item, depth + 1)).join(', ');
		return value.length > 20 ? `${shown}, …` : shown;
	}
	if (typeof value === 'object') {
		const entries = Object.entries(value as Record<string, unknown>).slice(0, 20);
		const shown = entries.map(([key, item]) => `${key}: ${formatValue(item, depth + 1)}`).join('; ');
		return Object.keys(value).length > 20 ? `${shown}; …` : shown;
	}
	return 'Unsupported value';
}

export async function readJpegExif(data: Uint8Array): Promise<ExifTag[]> {
	validateExifJpeg(data);
	let parsed: unknown;
	try {
		parsed = await exifr.parse(data, {
			tiff: true,
			ifd0: true,
			exif: true,
			gps: true,
			interop: true,
			ifd1: false,
			makerNote: false,
			userComment: false,
			xmp: false,
			iptc: false,
			icc: false,
			jfif: false,
			sanitize: true,
			mergeOutput: true,
		});
	} catch {
		throw new Error('Could not read EXIF data. The JPEG may be damaged or use an unsupported encoding.');
	}
	if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return [];
	return Object.entries(parsed as Record<string, unknown>)
		.map(([name, value]) => ({ name, value: formatValue(value) }))
		.filter((tag) => tag.value !== '')
		.sort((first, second) => first.name.localeCompare(second.name));
}
