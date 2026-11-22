// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PaymentVoucherInput } from '../../engines/payment-voucher';
import PaymentVoucherGenerator from './PaymentVoucherGenerator';

const { createPaymentVoucherPdf, triggerDownload } = vi.hoisted(() => ({
	createPaymentVoucherPdf: vi.fn(async (_input: PaymentVoucherInput) => new Uint8Array([37, 80, 68, 70])),
	triggerDownload: vi.fn(),
}));

vi.mock('../../engines/payment-voucher', async (importOriginal) => {
	const original = await importOriginal<typeof import('../../engines/payment-voucher')>();
	return { ...original, createPaymentVoucherPdf: (input: PaymentVoucherInput) => createPaymentVoucherPdf(input) };
});

vi.mock('../../engines/pdf', () => ({ triggerDownload }));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
	createPaymentVoucherPdf.mockClear();
	triggerDownload.mockClear();
	container = document.createElement('div');
	document.body.append(container);
	root = createRoot(container);
	act(() => root.render(<PaymentVoucherGenerator />));
});

afterEach(() => {
	act(() => root.unmount());
	container.remove();
});

describe('PaymentVoucherGenerator', () => {
	it('shows payer, payee, payment, and approval details in a preview', () => {
		const preview = container.querySelector('.payment-voucher-preview');
		expect(preview?.textContent).toContain('PAYMENT VOUCHER');
		expect(preview?.textContent).toContain('PAYMENT AMOUNT');
		expect(preview?.textContent).toContain('Approved by');
		expect(preview?.textContent).toContain('does not verify that funds were transferred');
	});

	it('updates the live payment preview when the amount changes', () => {
		act(() => {
			const amount = container.querySelector<HTMLInputElement>('#voucher-amount');
			if (amount) {
				const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
				setter?.call(amount, '245.50');
				amount.dispatchEvent(new Event('input', { bubbles: true }));
				amount.dispatchEvent(new Event('change', { bubbles: true }));
			}
		});
		expect(container.querySelector('.payment-voucher-amount')?.textContent).toContain('NGN 245.50');
	});

	it('downloads the voucher PDF', async () => {
		await act(async () => container.querySelector<HTMLButtonElement>('.tool-actions button')?.click());
		expect(createPaymentVoucherPdf).toHaveBeenCalledTimes(1);
		expect(triggerDownload).toHaveBeenCalledTimes(1);
		expect(triggerDownload.mock.calls[0]?.[1]).toMatch(/\.pdf$/);
	});
});
