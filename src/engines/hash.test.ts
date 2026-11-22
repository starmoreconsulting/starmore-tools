import { describe, expect, it } from 'vitest';
import { formatHashBytes, hashBytes, hashText } from './hash';

describe('Hash engine', () => {
	it('generates known SHA-256 and SHA-1 text hashes', async () => {
		expect(await hashText('', 'SHA-256')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
		expect(await hashText('abc', 'SHA-1')).toBe('a9993e364706816aba3e25717850c26c9cd0d89d');
		expect(await hashText('abc', 'SHA-256')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
	});

	it('hashes bytes and UTF-8 text correctly', async () => {
		expect(await hashText('hello 世界', 'SHA-256')).toMatch(/^[0-9a-f]{64}$/);
		expect(await hashBytes(new Uint8Array([0, 1, 2, 255]), 'SHA-256')).toMatch(/^[0-9a-f]{64}$/);
	});

	it('supports SHA-384 and SHA-512', async () => {
		expect(await hashText('abc', 'SHA-384')).toMatch(/^[0-9a-f]{96}$/);
		expect(await hashText('abc', 'SHA-512')).toMatch(/^[0-9a-f]{128}$/);
	});

	it('rejects unsupported algorithms and formats file sizes', async () => {
		expect(formatHashBytes(512)).toBe('512 B');
		expect(formatHashBytes(1536)).toBe('1.5 KB');
		expect(formatHashBytes(1048576)).toBe('1.0 MB');
		await expect(hashText('abc', 'MD5' as 'SHA-256')).rejects.toThrow('supported hash algorithm');
	});
});
