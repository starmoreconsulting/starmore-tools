import { describe, expect, it } from 'vitest';
import { cellValueText, compactSheetName } from './excel-to-pdf';

describe('Excel to PDF helpers', () => {
	it('normalizes common cell values', () => {
		expect(cellValueText('Hello')).toBe('Hello');
		expect(cellValueText(42)).toBe('42');
		expect(cellValueText({ result: 55 })).toBe('55');
		expect(cellValueText({ richText: [{ text: 'Hello' }, { text: ' world' }] })).toBe('Hello world');
		expect(cellValueText({ hyperlink: 'https://example.com' })).toBe('https://example.com');
	});

	it('creates compact safe sheet names', () => {
		expect(compactSheetName('Sales / 2026')).toBe('Sales - 2026');
		expect(compactSheetName('')).toBe('Sheet');
	});
});
