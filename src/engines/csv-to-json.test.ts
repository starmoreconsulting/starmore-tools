import { describe, expect, it } from 'vitest';
import { convertCsvToJson } from './csv-to-json';

describe('convertCsvToJson', () => {
	it('converts rows into objects using the first row as headers', () => {
		expect(JSON.parse(convertCsvToJson('name,age\nAda,36\nLin,28'))).toEqual([
			{ name: 'Ada', age: '36' },
			{ name: 'Lin', age: '28' },
		]);
	});

	it('handles quoted commas, escaped quotes, and quoted line breaks', () => {
		const csv = 'name,note\nAda,"Hello, ""world"""\nLin,"first line\nsecond line"';
		expect(JSON.parse(convertCsvToJson(csv))).toEqual([
			{ name: 'Ada', note: 'Hello, "world"' },
			{ name: 'Lin', note: 'first line\nsecond line' },
		]);
	});

	it('handles a BOM, CRLF records, and trailing newlines', () => {
		expect(JSON.parse(convertCsvToJson('\uFEFFid,value\r\n1,yes\r\n'))).toEqual([{ id: '1', value: 'yes' }]);
	});

	it('preserves empty values and skips fully blank lines', () => {
		expect(JSON.parse(convertCsvToJson('a,b\n1,\n\n2,3'))).toEqual([
			{ a: '1', b: '' },
			{ a: '2', b: '3' },
		]);
	});

	it('returns an empty list when only a header row is supplied', () => {
		expect(JSON.parse(convertCsvToJson('id,name'))).toEqual([]);
	});

	it('rejects duplicate or empty headers', () => {
		expect(() => convertCsvToJson('name,name\nAda,Grace')).toThrow('must be unique');
		expect(() => convertCsvToJson('name, \nAda,Grace')).toThrow('non-empty header');
	});

	it('rejects rows with a different number of values than the header', () => {
		expect(() => convertCsvToJson('name,age\nAda,36,extra')).toThrow('Row 2 has 3 columns');
	});

	it('rejects malformed, unclosed, or misplaced quotes', () => {
		expect(() => convertCsvToJson('name,note\nAda,"hello')).toThrow('not closed');
		expect(() => convertCsvToJson('name,note\nAda,he"llo')).toThrow('Check the CSV quotes');
		expect(() => convertCsvToJson('name,note\nAda,"hello"x')).toThrow('Check the CSV quotes');
	});

	it('requires non-empty CSV content and enforces a size limit', () => {
		expect(() => convertCsvToJson(' \n ')).toThrow('Enter CSV data');
		expect(() => convertCsvToJson(`name\n${'a'.repeat(2_000_001)}`)).toThrow('under 2 MB');
	});
});
