import { useState } from 'react';
import {
	createPaymentVoucherPdf,
	PAYMENT_VOUCHER_CURRENCIES,
	PAYMENT_VOUCHER_MAX_TEXT_LENGTH,
	type PaymentVoucherCurrency,
	type PaymentVoucherInput,
} from '../../engines/payment-voucher';
import { triggerDownload } from '../../engines/pdf';

function localDateString(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

function initialVoucher(): PaymentVoucherInput {
	const today = localDateString(new Date());
	return {
		organization: 'Your Business',
		organizationDetails: '',
		payee: '',
		payeeDetails: '',
		voucherNumber: `PV-${today.replaceAll('-', '')}-001`,
		voucherDate: today,
		amount: 0,
		currency: 'NGN',
		paymentMethod: 'Bank transfer',
		paymentReference: '',
		accountCode: '',
		purpose: '',
		notes: '',
		preparedBy: '',
		approvedBy: '',
	};
}

function safeFilename(value: string): string {
	const name = value.trim().replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 60);
	return `${name || 'payment-voucher'}.pdf`;
}

function formatAmount(amount: number, currency: string): string {
	if (!Number.isFinite(amount) || amount <= 0) return '—';
	try {
		return `${currency} ${new Intl.NumberFormat('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)}`;
	} catch {
		return `${currency} ${amount.toFixed(2)}`;
	}
}

function isPaymentVoucherCurrency(value: string): value is PaymentVoucherCurrency {
	return PAYMENT_VOUCHER_CURRENCIES.some((currency) => currency === value);
}

export default function PaymentVoucherGenerator() {
	const [voucher, setVoucher] = useState(initialVoucher);
	const [message, setMessage] = useState('Voucher details stay in this browser.');
	const [busy, setBusy] = useState(false);

	const updateField = <K extends keyof PaymentVoucherInput>(key: K, value: PaymentVoucherInput[K]) => {
		setVoucher((current) => ({ ...current, [key]: value }));
		setMessage('');
	};

	const downloadPdf = async () => {
		setBusy(true);
		setMessage('');
		try {
			const bytes = await createPaymentVoucherPdf(voucher);
			triggerDownload(new Blob([bytes], { type: 'application/pdf' }), safeFilename(voucher.voucherNumber));
			setMessage('Payment voucher PDF downloaded.');
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Could not create the payment voucher PDF.');
		} finally {
			setBusy(false);
		}
	};

	return (
		<div>
			<div className="invoice-columns">
				<div className="invoice-form payment-voucher-form">
					<div className="calc-fields">
						<div className="calc-field">
							<label htmlFor="voucher-organization">Organization / payer</label>
							<input id="voucher-organization" maxLength={PAYMENT_VOUCHER_MAX_TEXT_LENGTH} value={voucher.organization} onChange={(event) => updateField('organization', event.target.value)} />
						</div>
						<div className="calc-field">
							<label htmlFor="voucher-organization-details">Organization address and contact</label>
							<textarea id="voucher-organization-details" maxLength={PAYMENT_VOUCHER_MAX_TEXT_LENGTH} rows={2} value={voucher.organizationDetails} onChange={(event) => updateField('organizationDetails', event.target.value)} placeholder="Address, phone, email" />
						</div>
						<div className="calc-field">
							<label htmlFor="voucher-payee">Payee</label>
							<input id="voucher-payee" maxLength={PAYMENT_VOUCHER_MAX_TEXT_LENGTH} value={voucher.payee} onChange={(event) => updateField('payee', event.target.value)} />
						</div>
						<div className="calc-field">
							<label htmlFor="voucher-payee-details">Payee address and payment details</label>
							<textarea id="voucher-payee-details" maxLength={PAYMENT_VOUCHER_MAX_TEXT_LENGTH} rows={2} value={voucher.payeeDetails} onChange={(event) => updateField('payeeDetails', event.target.value)} placeholder="Address, bank or account details" />
						</div>
						<div className="payment-voucher-fields">
							<div className="calc-field">
								<label htmlFor="voucher-number">Voucher number</label>
								<input id="voucher-number" maxLength={PAYMENT_VOUCHER_MAX_TEXT_LENGTH} value={voucher.voucherNumber} onChange={(event) => updateField('voucherNumber', event.target.value)} />
							</div>
							<div className="calc-field">
								<label htmlFor="voucher-date">Voucher date</label>
								<input id="voucher-date" type="date" value={voucher.voucherDate} onChange={(event) => updateField('voucherDate', event.target.value)} />
							</div>
						</div>
						<div className="payment-voucher-fields">
							<div className="calc-field">
								<label htmlFor="voucher-amount">Payment amount</label>
								<input id="voucher-amount" type="number" min="0.01" step="0.01" value={Number.isFinite(voucher.amount) && voucher.amount !== 0 ? voucher.amount : ''} onChange={(event) => updateField('amount', event.target.value === '' ? 0 : Number(event.target.value))} />
							</div>
							<div className="calc-field">
								<label htmlFor="voucher-currency">Currency</label>
								<select id="voucher-currency" value={voucher.currency} onChange={(event) => {
									if (isPaymentVoucherCurrency(event.target.value)) updateField('currency', event.target.value);
								}}>
									{PAYMENT_VOUCHER_CURRENCIES.map((currency) => <option key={currency} value={currency}>{currency}</option>)}
								</select>
							</div>
						</div>
						<div className="payment-voucher-fields">
							<div className="calc-field">
								<label htmlFor="voucher-method">Payment method</label>
								<select id="voucher-method" value={voucher.paymentMethod} onChange={(event) => updateField('paymentMethod', event.target.value)}>
									<option>Bank transfer</option><option>Cash</option><option>Cheque</option><option>Card</option><option>Mobile money</option><option>Other</option>
								</select>
							</div>
							<div className="calc-field">
								<label htmlFor="voucher-reference">Payment reference</label>
								<input id="voucher-reference" maxLength={PAYMENT_VOUCHER_MAX_TEXT_LENGTH} value={voucher.paymentReference} onChange={(event) => updateField('paymentReference', event.target.value)} placeholder="Optional" />
							</div>
						</div>
						<div className="payment-voucher-fields">
							<div className="calc-field">
								<label htmlFor="voucher-account">Account / cost code</label>
								<input id="voucher-account" maxLength={PAYMENT_VOUCHER_MAX_TEXT_LENGTH} value={voucher.accountCode} onChange={(event) => updateField('accountCode', event.target.value)} placeholder="Optional" />
							</div>
							<div className="calc-field">
								<label htmlFor="voucher-prepared">Prepared by</label>
								<input id="voucher-prepared" maxLength={PAYMENT_VOUCHER_MAX_TEXT_LENGTH} value={voucher.preparedBy} onChange={(event) => updateField('preparedBy', event.target.value)} />
							</div>
						</div>
						<div className="calc-field">
							<label htmlFor="voucher-purpose">Purpose of payment</label>
							<textarea id="voucher-purpose" maxLength={PAYMENT_VOUCHER_MAX_TEXT_LENGTH} rows={3} value={voucher.purpose} onChange={(event) => updateField('purpose', event.target.value)} placeholder="What is this payment for?" />
						</div>
						<div className="calc-field">
							<label htmlFor="voucher-approved">Approved by</label>
							<input id="voucher-approved" maxLength={PAYMENT_VOUCHER_MAX_TEXT_LENGTH} value={voucher.approvedBy} onChange={(event) => updateField('approvedBy', event.target.value)} />
						</div>
						<div className="calc-field">
							<label htmlFor="voucher-notes">Additional notes</label>
							<textarea id="voucher-notes" maxLength={PAYMENT_VOUCHER_MAX_TEXT_LENGTH} rows={3} value={voucher.notes} onChange={(event) => updateField('notes', event.target.value)} placeholder="Optional supporting details" />
						</div>
					</div>
				</div>

				<section className="payment-voucher-preview" aria-label="Live payment voucher preview">
					<header className="payment-voucher-header">
						<div><p className="invoice-generator-kicker">PAYMENT VOUCHER</p><h2>{voucher.organization || 'Your Business'}</h2><p>{voucher.organizationDetails || 'Organization address and contact'}</p></div>
						<div className="invoice-generator-title"><strong>{voucher.voucherNumber || 'Voucher number'}</strong><p>{voucher.voucherDate || 'Voucher date'}</p></div>
					</header>
					<div className="payment-voucher-parties">
						<div><p className="invoice-generator-kicker">PAY TO</p><strong>{voucher.payee || 'Payee name'}</strong><p>{voucher.payeeDetails || 'Payee address and payment details'}</p></div>
						<div className="payment-voucher-amount"><p className="invoice-generator-kicker">PAYMENT AMOUNT</p><strong>{formatAmount(voucher.amount, voucher.currency)}</strong></div>
					</div>
					<div className="payment-voucher-details">
						<p><span>Method</span><strong>{voucher.paymentMethod}</strong></p>
						<p><span>Payment reference</span><strong>{voucher.paymentReference || '—'}</strong></p>
						<p><span>Account / cost code</span><strong>{voucher.accountCode || '—'}</strong></p>
					</div>
					<div className="payment-voucher-purpose"><p className="invoice-generator-kicker">PURPOSE</p><p>{voucher.purpose || 'Payment purpose'}</p></div>
					{voucher.notes && <div className="payment-voucher-purpose"><p className="invoice-generator-kicker">NOTES</p><p>{voucher.notes}</p></div>}
					<div className="payment-voucher-signatures">
						<div><span>Prepared by</span><strong>{voucher.preparedBy || '________________'}</strong></div>
						<div><span>Approved by</span><strong>{voucher.approvedBy || '________________'}</strong></div>
						<div><span>Payment processed by</span><strong>________________</strong></div>
					</div>
					<p className="payment-voucher-notice">Internal payment documentation only. This voucher does not verify that funds were transferred or cleared.</p>
				</section>
			</div>
			<div className="tool-actions">
				<button className="tool-button" type="button" disabled={busy} onClick={downloadPdf}>{busy ? 'Creating PDF…' : 'Download payment voucher PDF'}</button>
			</div>
			<p className="tool-message" role="status">{message}</p>
		</div>
	);
}
