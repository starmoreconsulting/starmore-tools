import { describe, expect, it } from 'vitest';
import { convertJsonToCsv } from './json-to-csv';

describe('convertJsonToCsv', () => {
	it('converts an array of objects with proper CSV quoting', () => {
		const result = convertJsonToCsv(JSON.stringify([
			{ name: 'Ada', note: 'Hello, "world"' },
			{ name: 'Lin', note: 'line one\nline two' },
		]));
		expect(result.csv).toBe('"name","note"\r\n"Ada","Hello, ""world"""\r\n"Lin","line one\nline two"');
		expect(result).toMatchObject({ records: 2, columns: 2, protectedCells: 0 });
	});

	it('unions columns in first-seen order and fills missing values with empty cells', () => {
		expect(convertJsonToCsv('[{"name":"Ada","age":36},{"name":"Lin","city":"Lagos"}]').csv)
			.toBe('"name","age","city"\r\n"Ada","36",""\r\n"Lin","","Lagos"');
	});

	it('serializes booleans, nulls, arrays, and objects consistently', () => {
		expect(convertJsonToCsv('[{"active":true,"empty":null,"tags":["a","b"],"meta":{"id":1}}]').csv)
			.toBe('"active","empty","tags","meta"\r\n"true","","[""a"",""b""]","{""id"":1}"');
	});

	it('prefixes formula-like text cells by default', () => {
		const result = convertJsonToCsv('[{"value":"=1+1"},{"value":"@SUM(A1:A2)"}]');
		expect(result.csv).toBe('"value"\r\n"\'=1+1"\r\n"\'@SUM(A1:A2)"');
		expect(result.protectedCells).toBe(2);
	});

	it('can disable formula protection when exact text preservation is needed', () => {
		const result = convertJsonToCsv('[{"value":"=1+1"}]', false);
		expect(result.csv).toBe('"value"\r\n"=1+1"');
		expect(result.protectedCells).toBe(0);
	});

	it('rejects invalid JSON and unsupported roots or records', () => {
		expect(() => convertJsonToCsv('{bad')).toThrow('Invalid JSON');
		expect(() => convertJsonToCsv('{"name":"Ada"}')).toThrow('non-empty JSON array');
		expect(() => convertJsonToCsv('[1,2]')).toThrow('every item is an object');
		expect(() => convertJsonToCsv('[]')).toThrow('non-empty JSON array');
		expect(() => convertJsonToCsv('[{}]')).toThrow('at least one property');
	});

	it('rejects oversized input', () => {
		expect(() => convertJsonToCsv(`[]${' '.repeat(2_000_001)}`)).toThrow('under 2 MB');
	});
});
