export type UuidVersion = 'v4' | 'v1';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function randomBytes(length: number): Uint8Array {
	const cryptoApi = globalThis.crypto;
	if (!cryptoApi?.getRandomValues) throw new Error('Secure randomness is not available in this browser.');
	const bytes = new Uint8Array(length);
	cryptoApi.getRandomValues(bytes);
	return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
	return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function isValidUuid(value: string): boolean {
	if (typeof value !== 'string') return false;
	const trimmed = value.trim();
	const unwrapped = trimmed.startsWith('{') && trimmed.endsWith('}') ? trimmed.slice(1, -1) : trimmed;
	return UUID_PATTERN.test(unwrapped);
}

export function formatUuid(hex: string, uppercase = false, braces = false): string {
	const uuid = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
	const formatted = uppercase ? uuid.toUpperCase() : uuid;
	return braces ? `{${formatted}}` : formatted;
}

export function generateUuidV4(options: { uppercase?: boolean; braces?: boolean } = {}): string {
	const bytes = randomBytes(16);
	bytes[6] = (bytes[6] & 0x0f) | 0x40;
	bytes[8] = (bytes[8] & 0x3f) | 0x80;
	return formatUuid(bytesToHex(bytes), options.uppercase, options.braces);
}

export function generateUuidV1(options: { uppercase?: boolean; braces?: boolean; date?: Date } = {}): string {
	const date = options.date ?? new Date();
	if (Number.isNaN(date.getTime())) throw new Error('Choose a valid timestamp for UUID v1.');

	const timestamp = date.getTime() * 10000 + 122192928000000000;
	const timeLow = Math.floor(timestamp) % 0x100000000;
	const timeMid = Math.floor(timestamp / 0x100000000) % 0x10000;
	const timeHi = Math.floor(timestamp / 0x1000000000000) % 0x1000;
	const lowHex = timeLow.toString(16).padStart(8, '0');
	const midHex = timeMid.toString(16).padStart(4, '0');
	const hiHex = ((timeHi & 0xfff) | 0x1000).toString(16).padStart(4, '0');

	const random = randomBytes(8);
	const clockSeq = ((random[0] & 0x3f) | 0x80).toString(16).padStart(2, '0')
		+ random[1].toString(16).padStart(2, '0');
	const node = bytesToHex(random.subarray(2, 8));
	const hex = `${lowHex}${midHex}${hiHex}${clockSeq}${node}`;
	return formatUuid(hex, options.uppercase, options.braces);
}

export function generateUuids(
	count: number,
	version: UuidVersion = 'v4',
	options: { uppercase?: boolean; braces?: boolean } = {},
): string[] {
	if (!Number.isInteger(count) || count < 1 || count > 100) {
		throw new Error('Quantity must be a whole number between 1 and 100.');
	}
	if (version !== 'v4' && version !== 'v1') throw new Error('Choose UUID v1 or UUID v4.');
	return Array.from({ length: count }, () => version === 'v4'
		? generateUuidV4(options)
		: generateUuidV1(options));
}
