import { Unzip, UnzipInflate, type UnzipFile } from 'fflate';
import { normalizeZipPath } from './zip-creator';

export const ZIP_EXTRACTOR_MAX_ARCHIVE_BYTES = 20_000_000;
export const ZIP_EXTRACTOR_MAX_ENTRIES = 500;
export const ZIP_EXTRACTOR_MAX_ENTRY_BYTES = 25_000_000;
export const ZIP_EXTRACTOR_MAX_TOTAL_BYTES = 100_000_000;

export interface ZipEntry {
	index: number;
	name: string;
	size: number | null;
	compressedSize: number | null;
	compression: number;
}

function isDirectory(name: string): boolean {
	return /[\\/]$/.test(name);
}

function validateArchiveSize(data: Uint8Array): void {
	if (data.length === 0) throw new Error('The selected file is empty.');
	if (data.length > ZIP_EXTRACTOR_MAX_ARCHIVE_BYTES) {
		throw new Error('ZIP archive is too large. Choose an archive no larger than 20 MB.');
	}
	if (data.length < 22) {
		throw new Error('ZIP archive is incomplete or damaged.');
	}
	let hasZipSignature = false;
	for (let index = 0; index < data.length - 3; index += 1) {
		if (data[index] === 0x50 && data[index + 1] === 0x4b
			&& ((data[index + 2] === 0x03 && data[index + 3] === 0x04)
				|| (data[index + 2] === 0x05 && data[index + 3] === 0x06)
				|| (data[index + 2] === 0x07 && data[index + 3] === 0x08))) {
			hasZipSignature = true;
			break;
		}
	}
	if (!hasZipSignature) throw new Error('This file does not appear to be a valid ZIP archive.');
}

function createUnzipper(onfile: (file: UnzipFile) => void): Unzip {
	const unzipper = new Unzip(onfile);
	unzipper.register(UnzipInflate);
	return unzipper;
}

export function inspectZipArchive(data: Uint8Array): ZipEntry[] {
	validateArchiveSize(data);
	const entries: ZipEntry[] = [];
	let fileIndex = 0;
	const unzipper = createUnzipper((file) => {
		fileIndex += 1;
		if (fileIndex > ZIP_EXTRACTOR_MAX_ENTRIES) {
			throw new Error(`ZIP contains more than ${ZIP_EXTRACTOR_MAX_ENTRIES} entries, which is not supported.`);
		}
		if (isDirectory(file.name)) return;
		entries.push({
			index: fileIndex - 1,
			name: file.name,
			size: Number.isSafeInteger(file.originalSize) ? file.originalSize! : null,
			compressedSize: Number.isSafeInteger(file.size) ? file.size! : null,
			compression: file.compression,
		});
	});

	try {
		unzipper.push(data, true);
	} catch (error) {
		if (error instanceof Error && error.message.includes('more than')) throw error;
		throw new Error('Could not read this ZIP archive. It may be damaged or use an unsupported format.');
	}
	if (entries.length === 0) throw new Error('This ZIP archive does not contain any files.');

	const knownTotalSize = entries.reduce((total, entry) => total + (entry.size ?? 0), 0);
	if (knownTotalSize > ZIP_EXTRACTOR_MAX_TOTAL_BYTES) {
		throw new Error('ZIP contents exceed the 100 MB total uncompressed size limit.');
	}
	return entries;
}

export function safeExtractedFilename(archivePath: string): string {
	const normalized = normalizeZipPath(archivePath);
	const filename = normalized.slice(normalized.lastIndexOf('/') + 1);
	return filename || 'extracted-file';
}

export function extractZipEntry(data: Uint8Array, entry: ZipEntry): Promise<Uint8Array> {
	validateArchiveSize(data);
	if (entry.size !== null && entry.size > ZIP_EXTRACTOR_MAX_ENTRY_BYTES) {
		return Promise.reject(new Error('This file exceeds the 25 MB per-file extraction limit.'));
	}
	if (entry.compression !== 0 && entry.compression !== 8) {
		return Promise.reject(new Error('This file uses a compression method that is not supported.'));
	}

	return new Promise((resolve, reject) => {
		let fileIndex = 0;
		let selected = false;
		let finished = false;
		let totalBytes = 0;
		const chunks: Uint8Array[] = [];
		const fail = (error: Error) => {
			if (finished) return;
			finished = true;
			reject(error);
		};
		const unzipper = createUnzipper((file) => {
			const currentIndex = fileIndex;
			fileIndex += 1;
			if (currentIndex !== entry.index) return;
			selected = true;
			if (file.originalSize !== undefined && file.originalSize > ZIP_EXTRACTOR_MAX_ENTRY_BYTES) {
				file.terminate();
				fail(new Error('This file exceeds the 25 MB per-file extraction limit.'));
				return;
			}
			file.ondata = (error, chunk, final) => {
				if (finished) return;
				if (error) {
					fail(new Error('Could not extract this file. It may be damaged, encrypted, or password-protected.'));
					return;
				}
				if (chunk?.length) {
					totalBytes += chunk.length;
					if (totalBytes > ZIP_EXTRACTOR_MAX_ENTRY_BYTES || totalBytes > ZIP_EXTRACTOR_MAX_TOTAL_BYTES) {
						file.terminate();
						fail(new Error('This file exceeds the 25 MB per-file extraction limit.'));
						return;
					}
					chunks.push(chunk);
				}
				if (final) {
					finished = true;
					const output = new Uint8Array(totalBytes);
					let offset = 0;
					for (const part of chunks) {
						output.set(part, offset);
						offset += part.length;
					}
					resolve(output);
				}
			};
			try {
				file.start();
			} catch (error) {
				fail(new Error(error instanceof Error ? error.message : 'Could not extract this file.'));
			}
		});

		try {
			unzipper.push(data, true);
		} catch {
			fail(new Error('Could not read this ZIP archive. It may be damaged or use an unsupported format.'));
			return;
		}
		if (!finished && !selected) {
			fail(new Error('The selected file is no longer present in this archive.'));
		} else if (!finished && selected) {
			fail(new Error('Could not extract this file. It may be damaged, encrypted, or password-protected.'));
		}
	});
}
