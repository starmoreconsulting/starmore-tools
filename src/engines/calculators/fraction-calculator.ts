export type FractionOperation = 'add' | 'subtract' | 'multiply' | 'divide';

export interface FractionResult {
	numerator: bigint;
	denominator: bigint;
	fraction: string;
	decimal: string;
}

interface Rational {
	numerator: bigint;
	denominator: bigint;
}

const MAX_INTEGER_DIGITS = 100;
const DECIMAL_PLACES = 8n;
const DECIMAL_SCALE = 10n ** DECIMAL_PLACES;

function parseInteger(value: string): bigint {
	const trimmed = value.trim();
	if (!/^[+-]?\d+$/.test(trimmed)) {
		throw new Error('Enter whole numbers for each numerator and denominator.');
	}
	if (trimmed.replace(/^[+-]/, '').length > MAX_INTEGER_DIGITS) {
		throw new Error(`Keep each number to ${MAX_INTEGER_DIGITS} digits or fewer.`);
	}
	return BigInt(trimmed);
}

function greatestCommonDivisor(first: bigint, second: bigint): bigint {
	let a = first < 0n ? -first : first;
	let b = second < 0n ? -second : second;
	while (b !== 0n) [a, b] = [b, a % b];
	return a;
}

function reduce(numerator: bigint, denominator: bigint): Rational {
	if (denominator === 0n) throw new Error('A denominator cannot be zero.');
	const sign = denominator < 0n ? -1n : 1n;
	const signedNumerator = numerator * sign;
	const positiveDenominator = denominator * sign;
	const divisor = greatestCommonDivisor(signedNumerator, positiveDenominator);
	return {
		numerator: signedNumerator / divisor,
		denominator: positiveDenominator / divisor,
	};
}

function formatDecimal(numerator: bigint, denominator: bigint): string {
	const negative = numerator < 0n;
	const absoluteNumerator = negative ? -numerator : numerator;
	const scaled = (absoluteNumerator * DECIMAL_SCALE * 2n + denominator) / (2n * denominator);
	const whole = scaled / DECIMAL_SCALE;
	const fraction = (scaled % DECIMAL_SCALE).toString().padStart(Number(DECIMAL_PLACES), '0').replace(/0+$/, '');
	return `${negative && scaled !== 0n ? '-' : ''}${whole}${fraction ? `.${fraction}` : ''}`;
}

export function calculateFraction(
	firstNumerator: string,
	firstDenominator: string,
	secondNumerator: string,
	secondDenominator: string,
	operation: FractionOperation,
): FractionResult {
	const first = reduce(parseInteger(firstNumerator), parseInteger(firstDenominator));
	const second = reduce(parseInteger(secondNumerator), parseInteger(secondDenominator));

	let numerator: bigint;
	let denominator: bigint;
	switch (operation) {
		case 'add':
			numerator = first.numerator * second.denominator + second.numerator * first.denominator;
			denominator = first.denominator * second.denominator;
			break;
		case 'subtract':
			numerator = first.numerator * second.denominator - second.numerator * first.denominator;
			denominator = first.denominator * second.denominator;
			break;
		case 'multiply':
			numerator = first.numerator * second.numerator;
			denominator = first.denominator * second.denominator;
			break;
		case 'divide':
			if (second.numerator === 0n) throw new Error('You cannot divide by a fraction equal to zero.');
			numerator = first.numerator * second.denominator;
			denominator = first.denominator * second.numerator;
			break;
	}

	const result = reduce(numerator, denominator);
	const fraction = result.denominator === 1n
		? result.numerator.toString()
		: `${result.numerator}/${result.denominator}`;
	return {
		...result,
		fraction,
		decimal: formatDecimal(result.numerator, result.denominator),
	};
}
