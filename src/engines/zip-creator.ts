import { strToU8, zipSync } from 'fflate';

export const ZIP_CREATOR_MAX_FILES = 100;
export const ZIP_CREATOR_MAX_TOTAL_BYTES = 50_000_000;

export interface ZipInputFile {
	name: string;
	size: number;
	arrayBuffer: () => Promise<ArrayBuffer>;
}

function safePathSegment(segment: string): string {
	return segment
		.replace(/[\u0000-\u001f<>:"|?*]/g, '_')
		.replace(/[. ]+$/g, '')
		.trim();
}

export function normalizeZipPath(path: string): string {
	const segments = path.replace(/\\/g, '/').split('/')
		.filter((segment) => segment && segment !== '.' && segment !== '..')
		.map(safePathSegment)
		.filter(Boolean);
	return segments.join('/') || 'file';
}

function makeUniquePath(path: string, usedPaths: Set<string>): string {
	const normalized = normalizeZipPath(path);
	const normalizedKey = normalized.toLocaleLowerCase();
	if (!usedPaths.has(normalizedKey)) {
		usedPaths.add(normalizedKey);
		return normalized;
	}

	const separator = normalized.lastIndexOf('/');
	const directory = separator >= 0 ? normalized.slice(0, separator + 1) : '';
	const filename = normalized.slice(separator + 1);
	const extensionIndex = filename.lastIndexOf('.');
	const hasExtension = extensionIndex > 0;
	const stem = hasExtension ? filename.slice(0, extensionIndex) : filename;
	const extension = hasExtension ? filename.slice(extensionIndex) : '';
	let suffix = 2;
	let candidate = `${directory}${stem} (${suffix})${extension}`;
	while (usedPaths.has(candidate.toLocaleLowerCase())) {
		suffix += 1;
		candidate = `${directory}${stem} (${suffix})${extension}`;
	}
	usedPaths.add(candidate.toLocaleLowerCase());
	return candidate;
}

export async function createZipArchive(files: ZipInputFile[]): Promise<Uint8Array> {
	if (files.length === 0) throw new Error('Choose at least one file to create a ZIP archive.');
	if (files.length > ZIP_CREATOR_MAX_FILES) {
		throw new Error(`Choose no more than ${ZIP_CREATOR_MAX_FILES} files at a time.`);
	}

	const totalBytes = files.reduce((total, file) => total + file.size, 0);
	if (!Number.isSafeInteger(totalBytes) || totalBytes > ZIP_CREATOR_MAX_TOTAL_BYTES) {
		throw new Error('Selected files exceed the 50 MB total size limit.');
	}

	const archiveFiles: Record<string, Uint8Array> = {};
	const usedPaths = new Set<string>();
	for (const file of files) {
		const path = makeUniquePath(file.name, usedPaths);
		archiveFiles[path] = new Uint8Array(await file.arrayBuffer());
	}
	archiveFiles[makeUniquePath('README.txt', usedPaths)] = strToU8('Created locally with Starmore Tools. Files were not uploaded.');

	return zipSync(archiveFiles, { level: 6 });
}
