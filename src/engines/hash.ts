export type HashAlgorithm = 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512';

export const HASH_ALGORITHMS: HashAlgorithm[] = ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'];

export async function hashBytes(data: ArrayBuffer | Uint8Array, algorithm: HashAlgorithm): Promise<string> {
	if (!HASH_ALGORITHMS.includes(algorithm)) throw new Error('Choose a supported hash algorithm.');
	if (!globalThis.crypto?.subtle) throw new Error('Secure hashing is not available in this browser.');
	const view = data instanceof Uint8Array ? data : new Uint8Array(data);
	const digest = await globalThis.crypto.subtle.digest(algorithm, view);
	return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function hashText(text: string, algorithm: HashAlgorithm): Promise<string> {
	if (typeof text !== 'string') throw new Error('Hash input must be text.');
	return hashBytes(new TextEncoder().encode(text), algorithm);
}

export function formatHashBytes(bytes: number): string {
	if (!Number.isFinite(bytes) || bytes < 0) return '0 B';
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
	if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
	return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}
