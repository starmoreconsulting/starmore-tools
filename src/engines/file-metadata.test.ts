import { describe, expect, it } from 'vitest';
import { formatFileSize, formatModifiedDate, getFileMetadata } from './file-metadata';

describe('file metadata', () => {
	it('reports filename, declared type, extension, size units, and modification date', () => {
		expect(getFileMetadata({
			name: 'report.csv',
			type: 'text/csv',
			size: 1500,
			lastModified: Date.parse('2025-01-02T03:04:05.000Z'),
		})).toEqual({
			name: 'report.csv',
			extension: '.csv',
			fileCategory: 'Data',
			declaredMimeType: 'text/csv',
			sizeBytes: 1500,
			sizeKilobytes: 1.5,
			sizeKibibytes: 1500 / 1024,
			lastModified: Date.parse('2025-01-02T03:04:05.000Z'),
			lastModifiedIso: '2025-01-02T03:04:05.000Z',
			imageLike: false,
		});
	});

	it('uses MIME type to identify an image even when it has no known extension', () => {
		expect(getFileMetadata({
			name: 'photo.custom',
			type: 'image/avif',
			size: 0,
			lastModified: 0,
		})).toMatchObject({
			extension: '.custom',
			fileCategory: 'Image',
			imageLike: true,
			lastModified: null,
			lastModifiedIso: null,
		});
	});

	it('reports missing browser-provided type and unknown extension safely', () => {
		expect(getFileMetadata({
			name: 'data.unknown',
			type: '',
			size: 10,
			lastModified: Number.NaN,
		})).toMatchObject({
			extension: '.unknown',
			fileCategory: 'Unknown',
			declaredMimeType: 'Not provided by browser',
			lastModified: null,
			lastModifiedIso: null,
			imageLike: false,
		});
	});

	it('formats byte units and validates values', () => {
		expect(formatFileSize(1500, 'bytes')).toBe('1,500 bytes');
		expect(formatFileSize(1500, 'kb')).toContain('1.5 KB');
		expect(formatFileSize(1024, 'kib')).toContain('1 KiB');
		expect(() => formatFileSize(-1, 'bytes')).toThrow('non-negative finite number');
		expect(formatModifiedDate(null)).toBe('Unavailable');
	});
});
