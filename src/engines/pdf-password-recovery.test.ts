// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { normalizeRecoveryCandidates, recoverPdfPassword } from './pdf-password-recovery';

describe('normalizeRecoveryCandidates',()=>{
	it('deduplicates dictionary and clue candidates',()=>{
		const candidates = normalizeRecoveryCandidates(' password \n123456\npassword', {
			mode: 'dictionary', clues: ['password', 'Starmore'], minimumLength: 1, maximumLength: 4, limit: 100,
		});
		expect(candidates[0]).toBe(' password ');
		expect(candidates).toContain('123456');
		expect(candidates).toContain('password');
		expect(candidates).toContain('Starmore');
		expect(new Set(candidates).size).toBe(candidates.length);
	});

	it('generates bounded digit candidates',()=>{
		const candidates = normalizeRecoveryCandidates('', {
			mode: 'digits', clues: [], minimumLength: 2, maximumLength: 2, limit: 100,
		});
		expect(candidates).toHaveLength(90);
		expect(candidates[0]).toBe('10');
		expect(candidates.at(-1)).toBe('99');
	});

	it('continues past incorrect remembered candidates and verifies the recovered PDF', async()=>{
		const source = await PDFDocument.create();
		source.addPage([300, 200]);
		const { encryptPDF } = await import('@pdfsmaller/pdf-encrypt');
		const encrypted = await encryptPDF(await source.save(), 'remembered phrase');
		const progress: number[] = [];

		const result = await recoverPdfPassword(encrypted, ['not the password', 'remembered phrase'], (current) => progress.push(current));

		expect(result?.password).toBe('remembered phrase');
		expect(result?.algorithm).toBe('AES-256');
		expect(await PDFDocument.load(result!.decrypted).then((document) => document.getPageCount())).toBe(1);
		expect(progress).toEqual([1, 2]);
	});

	it('recovers RC4-encrypted PDFs from a remembered candidate', async()=>{
		const source = await PDFDocument.create();
		source.addPage([300, 200]);
		const { encryptPDF } = await import('@pdfsmaller/pdf-encrypt');
		const encrypted = await encryptPDF(await source.save(), 'old remembered password', { algorithm: 'RC4' });

		const result = await recoverPdfPassword(encrypted, ['old remembered password'], () => undefined);

		expect(result?.password).toBe('old remembered password');
		expect(result?.algorithm).toBe('RC4');
		expect(await PDFDocument.load(result!.decrypted).then((document) => document.getPageCount())).toBe(1);
	});
});
