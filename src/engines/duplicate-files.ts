export const DUPLICATE_CHECKER_MAX_FILES = 100;
export const DUPLICATE_CHECKER_MAX_FILE_BYTES = 50_000_000;
export const DUPLICATE_CHECKER_MAX_TOTAL_BYTES = 200_000_000;

export interface DuplicateCheckFile {
	name: string;
	size: number;
	arrayBuffer: () => Promise<ArrayBuffer>;
}

export interface DuplicateFileGroup {
	hash: string;
	size: number;
	files: { name: string; index: number }[];
}

export interface DuplicateFileResults {
	checkedFiles: number;
	totalBytes: number;
	groups: DuplicateFileGroup[];
}

function validateFiles(files: DuplicateCheckFile[]): number {
	if (files.length < 2) throw new Error('Choose at least two files to compare.');
	if (files.length > DUPLICATE_CHECKER_MAX_FILES) {
		throw new Error(`Choose no more than ${DUPLICATE_CHECKER_MAX_FILES} files at a time.`);
	}

	let totalBytes = 0;
	for (const file of files) {
		if (!Number.isSafeInteger(file.size) || file.size < 0) {
			throw new Error(`Could not read the file size for ${file.name}.`);
		}
		if (file.size > DUPLICATE_CHECKER_MAX_FILE_BYTES) {
			throw new Error(`${file.name} exceeds the 50 MB per-file limit.`);
		}
		totalBytes += file.size;
	}
	if (!Number.isSafeInteger(totalBytes) || totalBytes > DUPLICATE_CHECKER_MAX_TOTAL_BYTES) {
		throw new Error('Selected files exceed the 200 MB total size limit.');
	}
	return totalBytes;
}

async function sha256(file: DuplicateCheckFile): Promise<string> {
	if (!globalThis.crypto?.subtle) {
		throw new Error('SHA-256 is unavailable. Open this page in a modern browser over HTTPS or localhost.');
	}
	const digest = await globalThis.crypto.subtle.digest('SHA-256', await file.arrayBuffer());
	return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function findDuplicateFiles(
	files: DuplicateCheckFile[],
	onProgress?: (completed: number, total: number) => void,
): Promise<DuplicateFileResults> {
	const totalBytes = validateFiles(files);
	const bySize = new Map<number, number[]>();
	files.forEach((file, index) => {
		const indices = bySize.get(file.size) ?? [];
		indices.push(index);
		bySize.set(file.size, indices);
	});

	const candidateIndices = [...bySize.values()].filter((indices) => indices.length > 1).flat();
	if (candidateIndices.length === 0) {
		onProgress?.(files.length, files.length);
		return { checkedFiles: files.length, totalBytes, groups: [] };
	}

	const hashes = new Map<string, { size: number; indices: number[] }>();
	for (let position = 0; position < candidateIndices.length; position += 1) {
		const index = candidateIndices[position];
		const file = files[index];
		const hash = await sha256(file);
		const key = `${file.size}:${hash}`;
		const group = hashes.get(key) ?? { size: file.size, indices: [] };
		group.indices.push(index);
		hashes.set(key, group);
		onProgress?.(position + 1, candidateIndices.length);
	}

	const groups = [...hashes.entries()]
		.filter(([, group]) => group.indices.length > 1)
		.map(([key, group]) => ({
			hash: key.slice(key.indexOf(':') + 1),
			size: group.size,
			files: group.indices.map((index) => ({ name: files[index].name, index })),
		}));

	return { checkedFiles: files.length, totalBytes, groups };
}
