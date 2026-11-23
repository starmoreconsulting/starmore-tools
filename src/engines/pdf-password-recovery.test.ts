// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import {
	generateRecoveryCandidates,
	MAX_PASSWORD_ATTEMPTS,
	recoverPdfWithCandidates,
} from './pdf-password-recovery';

describe('generateRecoveryCandidates', () => {
	it('keeps exact remembered entries first and adds only bounded simple variations', () => {
		const candidates = generateRecoveryCandidates(['Starmore Tools'], true);

		expect(candidates.slice(0, 1)).toEqual(['Starmore Tools']);
		expect(candidates).toContain('starmore tools');
		expect(candidates).toContain('STARMORE TOOLS');
		expect(candidates).toContain('Starmore-Tools');
		expect(candidates).toContain('Starmore_Tools');
		expect(candidates).not.toContain('Starmore Tools1');
		expect(new Set(candidates).size).toBe(candidates.length);
	});

	it('does not generate variations when they are disabled', () => {
		expect(generateRecoveryCandidates(['remembered phrase'], false)).toEqual(['remembered phrase']);
	});

	it('caps the number of generated attempts and rejects oversized remembered entries', () => {
		const entries = Array.from({ length: 50 }, (_, index) => `Remembered phrase ${index}`);
		expect(generateRecoveryCandidates(entries, true)).toHaveLength(MAX_PASSWORD_ATTEMPTS);
		expect(() => generateRecoveryCandidates(['x'.repeat(257)], false)).toThrow('256 characters or fewer');
	});
});

describe('recoverPdfWithCandidates', () => {
	it('checks remembered candidates in order and verifies the recovered PDF', async () => {
		const source = await PDFDocument.create();
		source.addPage([300, 200]);
		const { encryptPDF } = await import('@pdfsmaller/pdf-encrypt');
		const encrypted = await encryptPDF(await source.save(), 'remembered phrase');
		const progress: number[] = [];

		const result = await recoverPdfWithCandidates(encrypted, ['not the password', 'remembered phrase'], (current) => progress.push(current));

		expect(result?.algorithm).toBe('AES-256');
		expect(await PDFDocument.load(result!.decrypted).then((document) => document.getPageCount())).toBe(1);
		expect(progress).toEqual([1, 2]);
	});

	it('returns no result when none of the candidates match', async () => {
		const source = await PDFDocument.create();
		source.addPage([300, 200]);
		const { encryptPDF } = await import('@pdfsmaller/pdf-encrypt');
		const encrypted = await encryptPDF(await source.save(), 'remembered phrase');

		await expect(recoverPdfWithCandidates(encrypted, ['not the password'], () => undefined)).resolves.toBeNull();
	});

	it('rejects runs above the attempt limit', async () => {
		await expect(recoverPdfWithCandidates(new Uint8Array(), Array(MAX_PASSWORD_ATTEMPTS + 1).fill('candidate'), () => undefined))
			.rejects.toThrow(`limited to ${MAX_PASSWORD_ATTEMPTS} attempts`);
	});

	it('recovers RC4-encrypted PDFs from a remembered candidate', async () => {
		const source = await PDFDocument.create();
		source.addPage([300, 200]);
		const { encryptPDF } = await import('@pdfsmaller/pdf-encrypt');
		const encrypted = await encryptPDF(await source.save(), 'old remembered password', { algorithm: 'RC4' });

		const result = await recoverPdfWithCandidates(encrypted, ['old remembered password'], () => undefined);

		expect(result?.algorithm).toBe('RC4');
		expect(await PDFDocument.load(result!.decrypted).then((document) => document.getPageCount())).toBe(1);
	});
});
