import { describe, expect, it } from 'vitest';
import { formatUuid, generateUuidV1, generateUuidV4, generateUuids, isValidUuid } from './uuid';

describe('UUID engine', () => {
	it('generates RFC-style UUID v4 values', () => {
		const uuid = generateUuidV4();
		expect(isValidUuid(uuid)).toBe(true);
		expect(uuid[14]).toBe('4');
		expect(['8', '9', 'a', 'b']).toContain(uuid[19]);
	});

	it('generates UUID v1 values with the version nibble', () => {
		const uuid = generateUuidV1({ date: new Date('2026-01-02T03:04:05.000Z') });
		expect(isValidUuid(uuid)).toBe(true);
		expect(uuid[14]).toBe('1');
	});

	it('supports uppercase and brace formatting', () => {
		const hex = '12345678abcd4eef8abf1234567890ab';
		expect(formatUuid(hex)).toBe('12345678-abcd-4eef-8abf-1234567890ab');
		expect(formatUuid(hex, true, true)).toBe('{12345678-ABCD-4EEF-8ABF-1234567890AB}');
		expect(isValidUuid('{12345678-abcd-4eef-8abf-1234567890ab}')).toBe(true);
	});

	it('generates bulk UUIDs', () => {
		const uuids = generateUuids(25, 'v4');
		expect(uuids).toHaveLength(25);
		expect(new Set(uuids).size).toBe(25);
		expect(uuids.every(isValidUuid)).toBe(true);
	});

	it('validates quantity and versions', () => {
		expect(() => generateUuids(0)).toThrow('between 1 and 100');
		expect(() => generateUuids(101)).toThrow('between 1 and 100');
		expect(() => generateUuids(2, 'nil' as 'v4')).toThrow('UUID v1 or UUID v4');
		expect(() => generateUuidV1({ date: new Date('invalid') })).toThrow('valid timestamp');
	});
});
