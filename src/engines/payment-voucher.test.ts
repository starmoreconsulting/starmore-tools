import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import {
	createPaymentVoucherPdf,
	formatPaymentVoucherAmount,
	type PaymentVoucherInput,
} from './payment-voucher';

const voucher: PaymentVoucherInput = {
	organization: 'Starmore Studio',
	organizationDetails: '123 Market Road\nLagos, Nigeria',
	payee: 'Example Supplier',
	payeeDetails: '45 Supplier Avenue',
	voucherNumber: 'PV-2026-001',
	voucherDate: '2026-11-22',
	amount: 78500.5,
	currency: 'NGN',
	paymentMethod: 'Bank transfer',
	paymentReference: 'TRX-84210',
	accountCode: 'OPS-410',
	purpose: 'Office supplies and delivery charge',
	notes: 'Attach supplier invoice to the accounting record.',
	preparedBy: 'Alex Morgan',
	approvedBy: 'Jordan Lee',
};

describe('payment voucher', () => {
	it('formats the payment amount with an explicit currency', () => {
		expect(formatPaymentVoucherAmount(1250, 'USD')).toBe('USD 1,250.00');
		expect(() => formatPaymentVoucherAmount(-1, 'USD')).toThrow('valid payment amount');
		expect(() => formatPaymentVoucherAmount(1, 'XXX')).toThrow('supported currency');
	});

	it('creates a PDF payment voucher', async () => {
		const pdf = await PDFDocument.load(await createPaymentVoucherPdf(voucher));
		expect(pdf.getPageCount()).toBe(1);
		expect(pdf.getPage(0).getHeight()).toBeGreaterThan(800);
	});

	it('requires the organization, payee, voucher number, method, purpose, date, and positive amount', async () => {
		await expect(createPaymentVoucherPdf({ ...voucher, payee: ' ' })).rejects.toThrow('Payee name is required');
		await expect(createPaymentVoucherPdf({ ...voucher, paymentMethod: ' ' })).rejects.toThrow('Payment method is required');
		await expect(createPaymentVoucherPdf({ ...voucher, purpose: '' })).rejects.toThrow('Payment purpose is required');
		await expect(createPaymentVoucherPdf({ ...voucher, voucherDate: '2026-02-30' })).rejects.toThrow('valid voucher date');
		await expect(createPaymentVoucherPdf({ ...voucher, amount: 0 })).rejects.toThrow('greater than zero');
	});

	it('reports characters unsupported by the PDF font', async () => {
		await expect(createPaymentVoucherPdf({ ...voucher, payee: 'Supplier 東京' })).rejects.toThrow('supports basic Latin and Western European characters');
	});
});
