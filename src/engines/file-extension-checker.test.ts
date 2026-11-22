import { describe, expect, it } from 'vitest';
import { assessFileExtension } from './file-extension-checker';

describe('assessFileExtension', () => {
	it('recognizes a filename with a common document extension, case-insensitively', () => {
		expect(assessFileExtension('Report.PDF')).toMatchObject({
			extension: '.pdf',
			info: { category: 'Document', description: 'Portable Document Format' },
			suspiciousDoubleExtension: false,
		});
	});

	it('uses the final extension and flags a disguised executable', () => {
		const result = assessFileExtension('meeting-notes.pdf.exe');
		expect(result.extension).toBe('.exe');
		expect(result.suspiciousDoubleExtension).toBe(true);
		expect(result.warnings[0]).toContain('two extensions');
	});

	it('recognizes known compound archive extensions', () => {
		expect(assessFileExtension('backup.TAR.GZ')).toMatchObject({
			extension: '.tar.gz',
			info: { category: 'Archive' },
		});
	});

	it('handles dotfiles without treating the leading dot as an extension', () => {
		expect(assessFileExtension('.env')).toMatchObject({
			extension: '',
			isHiddenFile: true,
		});
	});

	it('handles a filename without an extension or with a trailing dot', () => {
		expect(assessFileExtension('README').extension).toBe('');
		expect(assessFileExtension('report.').hasTrailingDot).toBe(true);
	});

	it('uses only the final path segment when given a path', () => {
		expect(assessFileExtension('C:\\Documents\\annual-report.xlsx').baseName).toBe('annual-report.xlsx');
	});

	it('does not claim unknown extensions are malicious', () => {
		expect(assessFileExtension('archive.custom').warnings.at(-1))
			.toContain('does not necessarily mean the file is unsafe');
	});

	it('explains that executable files need a trusted source', () => {
		expect(assessFileExtension('setup.msi').warnings[0]).toContain('Only open files from sources you trust');
	});
});
