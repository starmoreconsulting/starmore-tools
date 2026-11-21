export const CURRENCY_RATES: Record<string, number> = {
	USD: 1,
	EUR: 0.92,
	GBP: 0.79,
	NGN: 1580,
	JPY: 149.5,
	CAD: 1.37,
	AUD: 1.53,
	CNY: 7.12,
	INR: 83.1,
	ZAR: 17.9,
	GHS: 15.4,
	KES: 129.5,
	AED: 3.67,
	SAR: 3.75,
};

export const CURRENCY_RATE_DATE = '2026-11-21';

export function convertCurrency(amount: number, from: string, to: string): number {
	if (!Number.isFinite(amount) || amount < 0) throw new Error('Enter a valid non-negative amount.');
	const fromRate = CURRENCY_RATES[from];
	const toRate = CURRENCY_RATES[to];
	if (!fromRate || !toRate) throw new Error('Choose a supported currency.');

	const usdAmount = amount / fromRate;
	const result = usdAmount * toRate;
	if (!Number.isFinite(result)) throw new Error('These values are too large to calculate safely.');
	return result;
}
