export type Base64Action = 'encode' | 'decode';

const BASE64_PATTERN = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

function bytesToBinary(bytes: Uint8Array): string {
	let binary = '';
	const chunkSize = 0x8000;
	for (let offset = 0; offset < bytes.length; offset += chunkSize) {
		const chunk = bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length));
		binary += String.fromCharCode(...chunk);
	}
	return binary;
}

function normalizeBase64(input: string): string {
	const compact = input.replace(/[\t\n\r ]/g, '');
	if (!/^[A-Za-z0-9+/]*={0,2}$/.test(compact)) {
		throw new Error('Base64 contains characters outside the standard alphabet or misplaced padding.');
	}
	const unpadded = compact.replace(/=+$/, '');
	const padding = compact.length - unpadded.length;
	if (padding > 0 && compact.length % 4 !== 0) throw new Error('Base64 has invalid padding.');
	if (compact.length % 4 === 1) throw new Error('Base64 has an invalid length.');
	if (padding === 1 && unpadded.length % 4 !== 3) throw new Error('Base64 has invalid padding.');
	if (padding === 2 && unpadded.length % 4 !== 2) throw new Error('Base64 has invalid padding.');

	const normalized = `${unpadded}${'='.repeat((4 - (unpadded.length % 4)) % 4)}`;
	if (!BASE64_PATTERN.test(normalized)) throw new Error('Base64 has invalid padding.');
	return normalized;
}

export function transformBase64(input: string, action: Base64Action): string {
	if (typeof input !== 'string') throw new Error('Base64 input must be text.');
	if (action !== 'encode' && action !== 'decode') throw new Error('Choose encode or decode.');

	if (action === 'encode') {
		return btoa(bytesToBinary(new TextEncoder().encode(input)));
	}

	const normalized = normalizeBase64(input);
	let binary: string;
	try {
		binary = atob(normalized);
	} catch {
		throw new Error('Base64 contains invalid data or padding.');
	}
	if (btoa(binary) !== normalized) throw new Error('Base64 has non-canonical padding bits.');

	const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
	try {
		return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
	} catch {
		throw new Error('Decoded Base64 is not valid UTF-8 text.');
	}
}
