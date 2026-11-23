// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CurrencyConverter from './CurrencyConverter';
import { CURRENCY_CODES } from '../../engines/calculators/currency-converter';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let container: HTMLDivElement;
let root: Root;

const rateRows = CURRENCY_CODES
	.filter((quote) => quote !== 'USD')
	.map((quote) => ({ date: '2026-11-23', base: 'USD', quote, rate: quote === 'NGN' ? 1580 : 1 }));

beforeEach(() => {
	vi.spyOn(globalThis, 'fetch').mockResolvedValue({
		ok: true,
		status: 200,
		json: async () => rateRows,
	} as Response);
	container = document.createElement('div');
	document.body.append(container);
	root = createRoot(container);
	act(() => root.render(<CurrencyConverter />));
});

afterEach(() => {
	act(() => root.unmount());
	container.remove();
	vi.restoreAllMocks();
});

function enterValue(id: string, value: string) {
	const input = container.querySelector<HTMLInputElement>(`#${id}`)!;
	act(() => {
		const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
		setter?.call(input, value);
		input.dispatchEvent(new Event('input', { bubbles: true }));
	});
}

describe('CurrencyConverter', () => {
	it('converts USD to NGN using fetched dated reference rates', async () => {
		await act(async () => {
			await vi.waitFor(() => {
				expect(container.querySelector('[role="status"]')?.textContent).toContain('Rates dated 2026-11-23');
			});
		});
		enterValue('currency-amount', '1');
		const results = container.querySelectorAll('.calc-result strong');
		expect(results[0]?.textContent).toBe('1,580.00 NGN');
		expect(container.querySelector('[role="status"]')?.textContent).toContain('not live trade quotes');
	});

	it('rejects negative amounts', async () => {
		await act(async () => {
			await vi.waitFor(() => {
				expect(container.querySelector('[role="status"]')?.textContent).toContain('Rates dated 2026-11-23');
			});
		});
		enterValue('currency-amount', '-10');
		expect(container.querySelector('[role="status"]')?.textContent).toContain('non-negative');
	});
});
