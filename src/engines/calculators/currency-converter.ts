export const CURRENCY_CODES = [
	'USD', 'EUR', 'GBP', 'NGN', 'JPY', 'CAD', 'AUD', 'CNY', 'INR', 'ZAR', 'GHS', 'KES', 'AED', 'SAR',
] as const;

export type CurrencyCode = (typeof CURRENCY_CODES)[number];
export type CurrencyRates = Record<CurrencyCode, number>;

const CURRENCY_QUOTES = CURRENCY_CODES.filter((code) => code !== 'USD').join(',');
export const CURRENCY_RATE_SOURCE = 'Frankfurter API, aggregating reference rates from central banks and official sources';
export const CURRENCY_RATE_SOURCE_URL = 'https://frankfurter.dev/';

interface CurrencyRateRow {
	date: string;
	base: string;
	quote: string;
	rate: number;
}

function isCurrencyCode(value: string): value is CurrencyCode {
	return (CURRENCY_CODES as readonly string[]).includes(value);
}

function isValidRateDate(value: string): boolean {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
	const date = new Date(`${value}T00:00:00Z`);
	return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export async function fetchLatestCurrencyRates(
	fetcher: typeof fetch = fetch,
	signal?: AbortSignal,
): Promise<{ date: string; rates: CurrencyRates }> {
	let response: Response;
	const controller = new AbortController();
	let timedOut = false;
	const timeoutId = setTimeout(() => {
		timedOut = true;
		controller.abort();
	}, 12_000);
	const abortRequest = () => controller.abort();
	signal?.addEventListener('abort', abortRequest, { once: true });
	try {
		response = await fetcher(`https://api.frankfurter.dev/v2/rates?base=USD&quotes=${CURRENCY_QUOTES}`, {
			headers: { Accept: 'application/json' },
			cache: 'no-store',
			signal: controller.signal,
		});
	} catch (error) {
		if (signal?.aborted) throw error;
		if (timedOut) throw new Error('The exchange-rate request timed out. Check your connection and try again.');
		throw new Error('Could not reach the public exchange-rate service. Check your connection and try again.');
	} finally {
		clearTimeout(timeoutId);
		signal?.removeEventListener('abort', abortRequest);
	}
	if (!response.ok) throw new Error(`Exchange-rate service returned HTTP ${response.status}. Try again later.`);

	let rows: unknown;
	try {
		rows = await response.json();
	} catch {
		throw new Error('Exchange-rate service returned unreadable data. Try again later.');
	}
	if (!Array.isArray(rows) || rows.length === 0) throw new Error('No current exchange rates are available from the public service.');

	const rates: Partial<CurrencyRates> = { USD: 1 };
	let rateDate = '';
	for (const item of rows as CurrencyRateRow[]) {
		if (!item || item.base !== 'USD' || typeof item.quote !== 'string' || !isCurrencyCode(item.quote)
			|| !Number.isFinite(item.rate) || item.rate <= 0
			|| typeof item.date !== 'string' || !isValidRateDate(item.date)) {
			throw new Error('Exchange-rate service returned invalid or unsupported rate data. Try again later.');
		}
		if (rateDate && rateDate !== item.date) throw new Error('Exchange-rate service returned inconsistent rate dates. Try again later.');
		rateDate = item.date;
		rates[item.quote] = item.rate;
	}

	const missing = CURRENCY_CODES.filter((code) => rates[code] === undefined);
	if (missing.length) throw new Error(`Current rates are unavailable for ${missing.join(', ')} from the public service.`);

	return { date: rateDate, rates: rates as CurrencyRates };
}

export function convertCurrency(amount: number, from: string, to: string, rates: CurrencyRates): number {
	if (!Number.isFinite(amount) || amount < 0) throw new Error('Enter a valid non-negative amount.');
	if (!isCurrencyCode(from) || !isCurrencyCode(to)) throw new Error('Choose a supported currency.');
	const fromRate = rates[from];
	const toRate = rates[to];
	if (!Number.isFinite(fromRate) || fromRate <= 0 || !Number.isFinite(toRate) || toRate <= 0) {
		throw new Error('Current exchange rates are not available for this conversion.');
	}

	const result = (amount / fromRate) * toRate;
	if (!Number.isFinite(result)) throw new Error('These values are too large to calculate safely.');
	return result;
}
