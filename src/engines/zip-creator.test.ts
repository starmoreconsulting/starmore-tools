import { strFromU8, unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { createZipArchive, normalizeZipPath, ZIP_CREATOR_MAX_FILES } from './zip-creator';

function file(name: string, content: string) {
	const bytes = new TextEncoder().encode(content);
	return {
		name,
		size: bytes.byteLength,
		arrayBuffer: async () => bytes.slice().buffer,
	};
}

describe('zip-creator', () => {
	it('creates a ZIP containing the selected files and a local-processing note', async () => {
		const archive = unzipSync(await createZipArchive([
			file('notes.txt', 'Hello'),
			file('folder/report.csv', 'id,value\n1,yes'),
		]));

		expect(strFromU8(archive['notes.txt'])).toBe('Hello');
		expect(strFromU8(archive['folder/report.csv'])).toBe('id,value\n1,yes');
		expect(strFromU8(archive['README.txt'])).toContain('Files were not uploaded.');
	});

	it('normalizes unsafe path segments and preserves safe folders', () => {
		expect(normalizeZipPath('../folder/../../report?.txt')).toBe('folder/report_.txt');
		expect(normalizeZipPath('C:\\Users\\Me\\notes.txt')).toBe('C_/Users/Me/notes.txt');
		expect(normalizeZipPath('../../')).toBe('file');
	});

	it('renames duplicate paths instead of overwriting archive contents', async () => {
		const archive = unzipSync(await createZipArchive([
			file('report.csv', 'first'),
			file('report.csv', 'second'),
			file('report (2).csv', 'third'),
			file('report.csv', 'fourth'),
		]));
		expect(Object.keys(archive).sort()).toEqual(['README.txt', 'report (2) (2).csv', 'report (2).csv', 'report (3).csv', 'report.csv']);
		expect(strFromU8(archive['report.csv'])).toBe('first');
		expect(strFromU8(archive['report (2).csv'])).toBe('second');
		expect(strFromU8(archive['report (2) (2).csv'])).toBe('third');
		expect(strFromU8(archive['report (3).csv'])).toBe('fourth');
	});

	it('avoids collisions on case-insensitive systems and preserves a selected README', async () => {
		const archive = unzipSync(await createZipArchive([
			file('README.txt', 'user readme'),
			file('A.txt', 'upper'),
			file('a.txt', 'lower'),
		]));
		expect(strFromU8(archive['README.txt'])).toBe('user readme');
		expect(strFromU8(archive['README (2).txt'])).toContain('Files were not uploaded.');
		expect(strFromU8(archive['a (2).txt'])).toBe('lower');
	});

	it('requires at least one file and enforces file count and total size limits', async () => {
		await expect(createZipArchive([])).rejects.toThrow('Choose at least one file');
		await expect(createZipArchive(Array.from({ length: ZIP_CREATOR_MAX_FILES + 1 }, () => file('a.txt', 'x')))).rejects.toThrow('no more than 100 files');
		await expect(createZipArchive([{
			name: 'large.bin',
			size: 50_000_001,
			arrayBuffer: async () => new ArrayBuffer(0),
		}])).rejects.toThrow('50 MB total size limit');
	});
});
