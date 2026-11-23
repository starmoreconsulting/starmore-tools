export const MAX_REMEMBERED_PASSWORDS = 50;
export const MAX_PASSWORD_ATTEMPTS = 250;

function titleCase(value: string) {
	return value.replace(/(^|[\s_-])(\S)/g, (_match, separator: string, character: string) => separator + character.toUpperCase());
}

export function generateRecoveryCandidates(rememberedPasswords: string[], includeVariants: boolean) {
	if (rememberedPasswords.length > MAX_REMEMBERED_PASSWORDS) {
		throw new Error(`Add no more than ${MAX_REMEMBERED_PASSWORDS} passwords or clues you personally remember.`);
	}
	if (rememberedPasswords.some((password) => password.length > 256)) {
		throw new Error('Each remembered password or clue must be 256 characters or fewer.');
	}

	const exactPasswords = [...new Set(rememberedPasswords.filter((password) => password.length > 0))];
	if (exactPasswords.length === 0) throw new Error('Add at least one password or clue you remember.');
	if (!includeVariants) return exactPasswords;

	const candidates = new Set(exactPasswords);
	for (const password of exactPasswords) {
		const variants = [
			password.toLowerCase(),
			password.toUpperCase(),
			titleCase(password),
			password.replace(/\s+/g, ''),
			password.replace(/\s+/g, '-'),
			password.replace(/\s+/g, '_'),
		];
		for (const variant of variants) {
			if (variant) candidates.add(variant);
		}
	}
	return [...candidates].slice(0, MAX_PASSWORD_ATTEMPTS);
}

export async function recoverPdfWithCandidates(
	pdfBytes: Uint8Array,
	candidates: string[],
	onProgress: (current: number, total: number) => void,
) {
	if (candidates.length > MAX_PASSWORD_ATTEMPTS) {
		throw new Error(`Recovery is limited to ${MAX_PASSWORD_ATTEMPTS} attempts per run.`);
	}

	const { detectPdfEncryption, decryptPdfAes128 } = await import('./pdf-aes128');
	const info = await detectPdfEncryption(pdfBytes);
	if (!info.encrypted) throw new Error('This PDF is not encrypted.');
	if (!info.supported) {
		throw new Error(`This PDF uses unsupported encryption (${info.algorithm}). Supported formats are AES-256 (V=5, R=6), RC4 (V=1–3, R=2–4), and AES-128 AESV2 (V=4, R=4).`);
	}

	for (let index = 0; index < candidates.length; index += 1) {
		onProgress(index + 1, candidates.length);
		try {
			const password = candidates[index];
			const decrypted = info.aes128
				? await decryptPdfAes128(pdfBytes, password)
				: await (async () => {
					const { decryptPDF } = await import('@pdfsmaller/pdf-decrypt');
					return decryptPDF(pdfBytes, password);
				})();
			const { PDFDocument } = await import('pdf-lib');
			const sourcePageCount = (await PDFDocument.load(pdfBytes, { ignoreEncryption: true, updateMetadata: false })).getPageCount();
			const unlockedPdf = await PDFDocument.load(decrypted, { updateMetadata: false });
			if (unlockedPdf.getPageCount() !== sourcePageCount) {
				throw new Error('The decrypted PDF did not pass integrity checks. No file was downloaded.');
			}
			return { decrypted, algorithm: info.algorithm ?? 'PDF encryption' };
		} catch (error) {
			const message = error instanceof Error ? error.message : '';
			if (message.includes('Incorrect password')) continue;
			throw error;
		}
	}
	return null;
}
