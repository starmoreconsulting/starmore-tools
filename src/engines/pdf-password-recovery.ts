export type PdfCandidateMode = 'dictionary' | 'digits' | 'lowercase';

export interface PdfRecoveryOptions {
	mode: PdfCandidateMode;
	clues: string[];
	minimumLength: number;
	maximumLength: number;
	limit: number;
}

export function normalizeRecoveryCandidates(raw: string, options: PdfRecoveryOptions): string[] {
	const candidates: string[] = [];
	const seen = new Set<string>();
	const add = (candidate: string, trim = false) => {
		const value = trim ? candidate.trim() : candidate;
		if (!value.trim() || value.length > 127 || seen.has(value) || candidates.length >= options.limit) return;
		seen.add(value);
		candidates.push(value);
	};

	for (const line of raw.split(/\r?\n/)) add(line);

	for (const clue of options.clues) {
		const base = clue.trim();
		if (!base) continue;
		add(base, true);
		add(base.toLowerCase(), true);
		add(base.toUpperCase(), true);
		const withLeading = base.charAt(0).toUpperCase() + base.slice(1).toLowerCase();
		add(withLeading, true);
		for (const suffix of ['', '123', '1234', '2024', '2025', '2026', '!', '@']) add(base + suffix, true);
		for (const suffix of ['', '123', '1234', '2024', '2025', '2026', '!', '@']) add(withLeading + suffix, true);
	}

	if (options.mode === 'digits') {
		for (let length = options.minimumLength; length <= options.maximumLength && candidates.length < options.limit; length++) {
			const start = length === 1 ? 0 : 10 ** (length - 1);
			const end = Math.min(10 ** length, start + options.limit - candidates.length);
			for (let n = start; n < end && candidates.length < options.limit; n++) add(n.toString().padStart(length, '0'));
		}
	}

	if (options.mode === 'lowercase') {
		const alphabet = 'abcdefghijklmnopqrstuvwxyz';
		const enumerate = (prefix: string, remaining: number) => {
			if (candidates.length >= options.limit) return;
			if (prefix.length >= options.minimumLength) add(prefix);
			if (remaining === 0) return;
			for (const character of alphabet) {
				enumerate(prefix + character, remaining - 1);
				if (candidates.length >= options.limit) return;
			}
		};
		for (let length = options.minimumLength; length <= options.maximumLength; length++) enumerate('', length);
	}

	return candidates;
}

export async function recoverPdfPassword(pdfBytes: Uint8Array, candidates: string[], onProgress: (current: number, total: number) => void) {
	const { detectPdfEncryption, decryptPdfAes128 } = await import('./pdf-aes128');
	const info = await detectPdfEncryption(pdfBytes);
	if (!info.encrypted) throw new Error('This PDF is not encrypted.');
	if (!info.supported) {
		throw new Error(`This PDF uses unsupported encryption (${info.algorithm}). Supported formats are AES-256 (V=5, R=6), RC4 (V=1–3, R=2–4), and AES-128 AESV2 (V=4, R=4).`);
	}

	const decryptCandidate = info.aes128
		? (candidate: string) => decryptPdfAes128(pdfBytes, candidate)
		: async (candidate: string) => {
			const { decryptPDF } = await import('@pdfsmaller/pdf-decrypt');
			return decryptPDF(pdfBytes, candidate);
		};
	const { PDFDocument } = await import('pdf-lib');
	const sourcePageCount = (await PDFDocument.load(pdfBytes, { ignoreEncryption: true, updateMetadata: false })).getPageCount();

	for (let index = 0; index < candidates.length; index++) {
		const candidate = candidates[index];
		onProgress(index + 1, candidates.length);
		try {
			const decrypted = await decryptCandidate(candidate);
			const unlockedPdf = await PDFDocument.load(decrypted, { updateMetadata: false });
			if (unlockedPdf.getPageCount() !== sourcePageCount) {
				throw new Error('The decrypted PDF did not pass integrity checks. No file was downloaded.');
			}
			return { password: candidate, decrypted, algorithm: info.algorithm ?? 'PDF encryption' };
		} catch (error) {
			const message = error instanceof Error ? error.message : '';
			if (message.includes('Incorrect password')) continue;
			throw error;
		}
		if (index % 25 === 24) await new Promise((resolve) => setTimeout(resolve, 0));
	}

	return null;
}
