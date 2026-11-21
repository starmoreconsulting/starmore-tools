import { describe, expect, it } from 'vitest';
import { createTextDownload, safeTextFilename } from './notepad';

describe('notepad helpers', () => {
	it('creates safe text filenames', () => {
		expect(safeTextFilename('  Meeting Notes / 2026  ')).toBe('Meeting-Notes-2026.txt');
		expect(safeTextFilename('')).toBe('untitled-notepad.txt');
		expect(safeTextFilename('***')).toBe('untitled-notepad.txt');
	});

	it('creates a UTF-8 plain-text download', async () => {
		const result = createTextDownload('Hello 🌿', 'My Note');
		expect(result.filename).toBe('My-Note.txt');
		expect(result.blob.type).toBe('text/plain;charset=utf-8');
		expect(await result.blob.text()).toBe('Hello 🌿');
	});
});
