import { strFromU8, unzipSync, zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { extractZipEntry, inspectZipArchive, safeExtractedFilename, ZIP_EXTRACTOR_MAX_ENTRY_BYTES } from './zip-extractor';

describe('zip-extractor', () => {
	it('lists archive entries without extracting them and extracts a selected nested file', async () => {
		const archive = zipSync({
			'folder/notes.txt': new TextEncoder().encode('Hello from the archive'),
			'data.csv': new TextEncoder().encode('id,value\n1,yes'),
		}, { level: 6 });
		const entries = inspectZipArchive(archive);
		expect(entries.map(({ name }) => name)).toEqual(['folder/notes.txt', 'data.csv']);
		expect(entries[0].size).toBe(22);

		const extracted = await extractZipEntry(archive, entries[0]);
		expect(strFromU8(extracted)).toBe('Hello from the archive');
	});

	it('ignores directory entries and rejects an empty archive', () => {
		const archive = zipSync({
			'folder/': new Uint8Array(),
			'folder/file.txt': new TextEncoder().encode('x'),
		});
		expect(inspectZipArchive(archive).map((entry) => entry.name)).toEqual(['folder/file.txt']);
		expect(() => inspectZipArchive(zipSync({}))).toThrow('does not contain any files');
	});

	it('limits oversized archives and individual outputs from metadata', async () => {
		expect(() => inspectZipArchive(new Uint8Array(20_000_001))).toThrow('no larger than 20 MB');
		const archive = zipSync({ 'large.bin': new Uint8Array(ZIP_EXTRACTOR_MAX_ENTRY_BYTES + 1) });
		const entry = inspectZipArchive(archive)[0];
		await expect(extractZipEntry(archive, entry)).rejects.toThrow('25 MB per-file extraction limit');
	});

	it('sanitizes archive paths before using them as download names', () => {
		expect(safeExtractedFilename('../../private/report?.txt')).toBe('report_.txt');
		expect(safeExtractedFilename('folder\\notes.txt')).toBe('notes.txt');
	});

	it('reports malformed archives instead of returning empty results', () => {
		expect(() => inspectZipArchive(new Uint8Array([0x50, 0x4b, 0x03, 0x04]))).toThrow('incomplete or damaged');
		expect(() => inspectZipArchive(new Uint8Array(24))).toThrow('does not appear to be a valid ZIP archive');
	});

	it('remains compatible with standard ZIP output', () => {
		const archive = zipSync({ 'hello.txt': new TextEncoder().encode('world') });
		expect(strFromU8(unzipSync(archive)['hello.txt'])).toBe('world');
	});
});
