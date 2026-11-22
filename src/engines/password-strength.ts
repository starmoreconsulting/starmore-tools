const commonPasswords = new Set([
	'123456',
	'123456789',
	'12345678',
	'password',
	'password1',
	'password123',
	'qwerty',
	'qwerty123',
	'admin',
	'letmein',
	'welcome',
	'iloveyou',
]);

const sequences = [
	'0123456789',
	'abcdefghijklmnopqrstuvwxyz',
	'qwertyuiop',
	'asdfghjkl',
	'zxcvbnm',
];

function hasSequence(password: string): boolean {
	const normalized = password.toLowerCase();
	return sequences.some((sequence) => {
		for (let index = 0; index <= sequence.length - 3; index += 1) {
			const fragment = sequence.slice(index, index + 3);
			if (normalized.includes(fragment) || normalized.includes([...fragment].reverse().join(''))) return true;
		}
		return false;
	});
}

export interface PasswordStrength {
	score: number;
	label: 'Not rated' | 'Very weak' | 'Weak' | 'Fair' | 'Good' | 'Strong' | 'Very strong';
	length: number;
	isCommon: boolean;
	hasRepeatedRun: boolean;
	hasSequence: boolean;
	characterTypes: number;
	feedback: string[];
}

export function assessPasswordStrength(password: string): PasswordStrength {
	const length = Array.from(password).length;
	if (length === 0) {
		return {
			score: 0,
			label: 'Not rated',
			length: 0,
			isCommon: false,
			hasRepeatedRun: false,
			hasSequence: false,
			characterTypes: 0,
			feedback: ['Enter a password to see a local strength estimate.'],
		};
	}

	const normalized = password.toLowerCase().trim();
	const isCommon = commonPasswords.has(normalized);
	const hasRepeatedRun = /(.)\1{2,}/u.test(password);
	const sequenceFound = hasSequence(password);
	const types = [
		/\p{Lu}/u.test(password),
		/\p{Ll}/u.test(password),
		/\p{N}/u.test(password),
		/[\p{P}\p{S}]/u.test(password),
	].filter(Boolean).length;

	let score = Number(length >= 8) + Number(length >= 12) + Number(length >= 16);
	score += types >= 3 ? 2 : types >= 2 ? 1 : 0;
	if (hasRepeatedRun) score -= 1;
	if (sequenceFound) score -= 1;
	score = isCommon ? 0 : Math.max(0, Math.min(5, score));

	const labels: PasswordStrength['label'][] = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very strong'];
	const feedback: string[] = [];
	if (isCommon) feedback.push('This is a common password. Choose something less predictable.');
	if (length < 12) feedback.push('Use at least 12 characters; a longer passphrase is even better.');
	if (types < 2) feedback.push('Use a longer passphrase or a broader mix of character types.');
	if (hasRepeatedRun) feedback.push('Avoid repeating the same character three or more times.');
	if (sequenceFound) feedback.push('Avoid keyboard patterns and sequential characters.');
	if (feedback.length === 0) feedback.push('Avoid reusing this password on another account.');

	return {
		score,
		label: labels[score],
		length,
		isCommon,
		hasRepeatedRun,
		hasSequence: sequenceFound,
		characterTypes: types,
		feedback,
	};
}
