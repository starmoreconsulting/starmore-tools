import { describe, expect, it } from 'vitest';
import {
	DUPLICATE_CHECKER_MAX_FILES,
	DUPLICATE_CHECKER_MAX_FILE_BYTES,
	DUPLICATE_CHECKER_MAX_TOTAL_BYTES,
	findDuplicateFiles,
} from './duplicate-files';

function createFile(name: string, content: string) {
	const bytes = new TextEncoder().encode(content);
	return {
		name,
		size: bytes.byteLength,
		arrayBuffer: async () => bytes.slice().buffer,
	};
}

describe('findDuplicateFiles', () => {
	it('matches identical content even when filenames differ', async () => {
		const result = await findDuplicateFiles([
			createFile('first.txt', 'same content'),
			createFile('renamed.txt', 'same content'),
			createFile('different.txt', 'other'),
		]);
		expect(result.checkedFiles).toBe(3);
		expect(result.groups).toHaveLength(1);
		expect(result.groups[0].files.map((file) => file.name)).toEqual(['first.txt', 'renamed.txt']);
		expect(result.groups[0].hash).toMatch(/^[a-f0-9]{64}$/);
	});

	it('does not call same-size files duplicates when their contents differ', async () => {
		const result = await findDuplicateFiles([
			createFile('one.txt', 'abcd'),
			createFile('two.txt', 'wxyz'),
			createFile('small.txt', 'x'),
		]);
		expect(result.groups).toEqual([]);
	});

	it('reports progress only for files whose sizes match another selected file', async () => {
		const progress: [number, number][] = [];
		await findDuplicateFiles([
			createFile('one.txt', 'same'),
			createFile('two.txt', 'same'),
			createFile('unique.txt', 'longer'),
		], (completed, total) => progress.push([completed, total]));
		expect(progress).toEqual([[1, 2], [2, 2]]);
	});

	it('requires at least two files and enforces count and size limits', async () => {
		await expect(findDuplicateFiles([createFile('only.txt', 'one')])).rejects.toThrow('at least two files');
		await expect(findDuplicateFiles(Array.from({ length: DUPLICATE_CHECKER_MAX_FILES + 1 }, (_, index) => createFile(`${index}.txt`, 'x')))).rejects.toThrow('no more than 100 files');
		await expect(findDuplicateFiles([createFile('a.txt', 'x'), {
			name: 'large.bin',
			size: DUPLICATE_CHECKER_MAX_FILE_BYTES + 1,
			arrayBuffer: async () => new ArrayBuffer(0),
		}])).rejects.toThrow('50 MB per-file limit');
		await expect(findDuplicateFiles([
			...Array.from({ length: 5 }, (_, index) => ({
				name: `${index}.bin`,
				size: DUPLICATE_CHECKER_MAX_TOTAL_BYTES / 5,
				arrayBuffer: async () => new ArrayBuffer(0),
			})),
			{ name: 'extra.bin', size: 1, arrayBuffer: async () => new ArrayBuffer(0) },
		])).rejects.toThrow('200 MB total size limit');
	});

	it('reports SHA-256 unavailability clearly', async () => {
		const originalCrypto = globalThis.crypto;
		Object.defineProperty(globalThis, 'crypto', { configurable: true, value: undefined });
		try {
			await expect(findDuplicateFiles([
				createFile('one.txt', 'same'),
				createFile('two.txt', 'same'),
			])).rejects.toThrow('SHA-256 is unavailable');
		} finally {
			Object.defineProperty(globalThis, 'crypto', { configurable: true, value: originalCrypto });
		}
	});
});
