import { describe, expect, it, vi } from 'vitest';
import {
	CURRENCY_CODES,
	convertCurrency,
	fetchLatestCurrencyRates,
	type CurrencyRates,
} from './currency-converter';

const rateRows = CURRENCY_CODES
	.filter((quote) => quote !== 'USD')
	.map((quote) => ({ date: '2026-11-23', base: 'USD', quote, rate: quote === 'EUR' ? 0.9 : 2 }));

const response = (payload: unknown, status = 200) => ({
	ok: status >= 200 && status < 300,
	status,
	json: vi.fn().mockResolvedValue(payload),
}) as unknown as Response;

describe('fetchLatestCurrencyRates', () => {
	it('loads and validates dated reference rates for every supported currency', async () => {
		const fetcher = vi.fn().mockResolvedValue(response(rateRows));

		const result = await fetchLatestCurrencyRates(fetcher);

		expect(result.date).toBe('2026-11-23');
		expect(result.rates.USD).toBe(1);
		expect(result.rates.EUR).toBe(0.9);
		expect(result.rates.NGN).toBe(2);
		expect(fetcher).toHaveBeenCalledWith(
			expect.stringContaining('https://api.frankfurter.dev/v2/rates?base=USD&quotes='),
			expect.objectContaining({ cache: 'no-store', headers: { Accept: 'application/json' } }),
		);
	});

	it('surfaces service, network, malformed, missing, and inconsistent rate failures', async () => {
		await expect(fetchLatestCurrencyRates(vi.fn().mockResolvedValue(response([], 503)))).rejects.toThrow('HTTP 503');
		await expect(fetchLatestCurrencyRates(vi.fn().mockRejectedValue(new Error('offline')))).rejects.toThrow('Could not reach');
		await expect(fetchLatestCurrencyRates(vi.fn().mockResolvedValue(response({ rates: {} })))).rejects.toThrow('No current exchange rates');
		await expect(fetchLatestCurrencyRates(vi.fn().mockResolvedValue(response(rateRows.slice(1))))).rejects.toThrow('unavailable for EUR');
		await expect(fetchLatestCurrencyRates(vi.fn().mockResolvedValue(response([
			...rateRows.slice(0, -1),
			{ ...rateRows.at(-1), rate: Number.NaN },
		])))).rejects.toThrow('invalid or unsupported rate data');
		await expect(fetchLatestCurrencyRates(vi.fn().mockResolvedValue(response([
			...rateRows.slice(0, -1),
			{ ...rateRows.at(-1), date: '2026-02-30' },
		])))).rejects.toThrow('invalid or unsupported rate data');
		await expect(fetchLatestCurrencyRates(vi.fn().mockResolvedValue(response([
			...rateRows.slice(0, -1),
			{ ...rateRows.at(-1), date: '2026-11-22' },
		])))).rejects.toThrow('inconsistent rate dates');
	});

	it('does not convert without validated current rates', () => {
		expect(() => convertCurrency(100, 'USD', 'EUR', {} as CurrencyRates)).toThrow('not available');
	});
});

describe('convertCurrency', () => {
	const rates: CurrencyRates = Object.fromEntries(CURRENCY_CODES.map((code) => [code, code === 'EUR' ? 0.9 : code === 'USD' ? 1 : 2])) as CurrencyRates;

	it('converts from and to USD reference rates', () => {
		expect(convertCurrency(100, 'USD', 'EUR', rates)).toBeCloseTo(90, 8);
		expect(convertCurrency(200, 'NGN', 'USD', rates)).toBe(100);
		expect(convertCurrency(100, 'USD', 'USD', rates)).toBe(100);
	});

	it('rejects invalid amounts and unsupported currency codes', () => {
		expect(() => convertCurrency(-1, 'USD', 'EUR', rates)).toThrow('Enter a valid non-negative amount.');
		expect(() => convertCurrency(Infinity, 'USD', 'EUR', rates)).toThrow('Enter a valid non-negative amount.');
		expect(() => convertCurrency(10, 'XXX', 'USD', rates)).toThrow('Choose a supported currency.');
		expect(() => convertCurrency(10, 'USD', 'XXX', rates)).toThrow('Choose a supported currency.');
	});
});
