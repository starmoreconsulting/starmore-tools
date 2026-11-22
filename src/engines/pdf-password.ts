export type PdfEncryptionAlgorithm = 'AES-256' | 'RC4';

export function validatePdfPassword(password: string, confirmPassword: string) {
	if (!password.trim()) throw new Error('Enter a password for this PDF.');
	if (password !== confirmPassword) throw new Error('Passwords do not match.');
	if (password.length < 6) throw new Error('Use a password of at least 6 characters.');
	if (password.length > 127) throw new Error('Use a password of 127 characters or fewer.');
	return password;
}
