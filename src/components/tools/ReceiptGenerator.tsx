import { useMemo, useState } from 'react';
import {
	calculateReceiptTotals,
	createReceiptDocument,
	type ReceiptGeneratorInput,
} from '../../engines/receipt-generator';
import {
	formatInvoiceMoney,
	INVOICE_GENERATOR_MAX_ITEMS,
	INVOICE_GENERATOR_MAX_NAME_LENGTH,
	INVOICE_GENERATOR_MAX_NUMBER_LENGTH,
	type InvoiceGeneratorItem,
} from '../../engines/invoice-generator';
import { triggerDownload } from '../../engines/pdf';

function localDateString(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

function initialReceipt(): ReceiptGeneratorInput {
	const today = localDateString(new Date());
	return {
		sellerName: 'Your Business',
		sellerDetails: '',
		customerName: '',
		customerDetails: '',
		receiptNumber: `RCT-${today.replaceAll('-', '')}-001`,
		receiptDate: today,
		currency: 'NGN',
		taxRate: 0,
		paymentMethod: 'Cash',
		reference: '',
		notes: 'Payment received with thanks.',
		items: [{ description: 'Product or service', quantity: 1, unitPrice: 0 }],
	};
}

function safeFilename(value: string): string {
	const name = value.trim().replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 60);
	return `${name || 'receipt'}.pdf`;
}

export default function ReceiptGenerator() {
	const [receipt, setReceipt] = useState(initialReceipt);
	const [message, setMessage] = useState('Your receipt details stay in this browser.');
	const [busy, setBusy] = useState(false);
	const totals = useMemo(() => {
		try {
			return { value: calculateReceiptTotals(receipt.items, receipt.taxRate), error: '' };
		} catch (error) {
			return { value: null, error: error instanceof Error ? error.message : 'Could not calculate receipt totals.' };
		}
	}, [receipt.items, receipt.taxRate]);

	const updateField = <K extends keyof ReceiptGeneratorInput>(key: K, value: ReceiptGeneratorInput[K]) => {
		setReceipt((current) => ({ ...current, [key]: value }));
		setMessage('');
	};

	const updateItem = (index: number, key: keyof InvoiceGeneratorItem, value: string) => {
		setReceipt((current) => ({
			...current,
			items: current.items.map((item, itemIndex) => itemIndex === index
				? { ...item, [key]: key === 'description' ? value : value === '' ? Number.NaN : Number(value) }
				: item),
		}));
		setMessage('');
	};

	const downloadPdf = async () => {
		setBusy(true);
		setMessage('');
		try {
			const bytes = await createReceiptDocument(receipt);
			triggerDownload(new Blob([bytes], { type: 'application/pdf' }), safeFilename(receipt.receiptNumber));
			setMessage('Receipt PDF downloaded.');
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Could not create the receipt PDF.');
		} finally {
			setBusy(false);
		}
	};

	const displayMoney = (value: number) => {
		try {
			return formatInvoiceMoney(value, receipt.currency);
		} catch {
			return `${receipt.currency} ${value.toFixed(2)}`;
		}
	};

	return (
		<div>
			<div className="invoice-columns">
				<div className="invoice-form invoice-generator-form">
					<div className="calc-fields">
						<div className="calc-field">
							<label htmlFor="receipt-seller">Your business name</label>
							<input id="receipt-seller" maxLength={INVOICE_GENERATOR_MAX_NAME_LENGTH} value={receipt.sellerName} onChange={(event) => updateField('sellerName', event.target.value)} />
						</div>
						<div className="calc-field">
							<label htmlFor="receipt-seller-details">Your address and contact details</label>
							<textarea id="receipt-seller-details" maxLength={500} rows={3} value={receipt.sellerDetails} onChange={(event) => updateField('sellerDetails', event.target.value)} placeholder="Address, email, phone, tax ID" />
						</div>
						<div className="calc-field">
							<label htmlFor="receipt-customer">Received from</label>
							<input id="receipt-customer" maxLength={INVOICE_GENERATOR_MAX_NAME_LENGTH} value={receipt.customerName} onChange={(event) => updateField('customerName', event.target.value)} />
						</div>
						<div className="calc-field">
							<label htmlFor="receipt-customer-details">Customer address and details</label>
							<textarea id="receipt-customer-details" maxLength={500} rows={3} value={receipt.customerDetails} onChange={(event) => updateField('customerDetails', event.target.value)} placeholder="Address, email, phone, tax ID" />
						</div>
						<div className="invoice-generator-dates">
							<div className="calc-field">
								<label htmlFor="receipt-number">Receipt number</label>
								<input id="receipt-number" maxLength={INVOICE_GENERATOR_MAX_NUMBER_LENGTH} value={receipt.receiptNumber} onChange={(event) => updateField('receiptNumber', event.target.value)} />
							</div>
							<div className="calc-field">
								<label htmlFor="receipt-date">Payment date</label>
								<input id="receipt-date" type="date" value={receipt.receiptDate} onChange={(event) => updateField('receiptDate', event.target.value)} />
							</div>
						</div>
						<div className="invoice-generator-dates">
							<div className="calc-field">
								<label htmlFor="receipt-method">Payment method</label>
								<select id="receipt-method" value={receipt.paymentMethod} onChange={(event) => updateField('paymentMethod', event.target.value)}>
									<option>Cash</option><option>Bank transfer</option><option>Card</option><option>Mobile money</option><option>Cheque</option><option>Other</option>
								</select>
							</div>
							<div className="calc-field">
								<label htmlFor="receipt-currency">Currency</label>
								<select id="receipt-currency" value={receipt.currency} onChange={(event) => updateField('currency', event.target.value)}>
									<option value="NGN">NGN — Nigerian naira</option>
									<option value="USD">USD — US dollar</option>
									<option value="EUR">EUR — Euro</option>
									<option value="GBP">GBP — British pound</option>
									<option value="CAD">CAD — Canadian dollar</option>
									<option value="AUD">AUD — Australian dollar</option>
									<option value="GHS">GHS — Ghanaian cedi</option>
									<option value="KES">KES — Kenyan shilling</option>
									<option value="ZAR">ZAR — South African rand</option>
									<option value="INR">INR — Indian rupee</option>
								</select>
							</div>
						</div>
						<div className="invoice-generator-dates">
							<div className="calc-field">
								<label htmlFor="receipt-reference">Payment reference (optional)</label>
								<input id="receipt-reference" maxLength={500} value={receipt.reference} onChange={(event) => updateField('reference', event.target.value)} />
							</div>
							<div className="calc-field">
								<label htmlFor="receipt-tax">Tax rate</label>
								<div className="calc-input-suffix">
									<input id="receipt-tax" type="number" min="0" max="100" step="0.01" value={Number.isFinite(receipt.taxRate) ? receipt.taxRate : ''} onChange={(event) => updateField('taxRate', event.target.value === '' ? Number.NaN : Number(event.target.value))} />
									<span>%</span>
								</div>
							</div>
						</div>
					</div>

					<div className="invoice-generator-lines">
						<strong>Items paid for</strong>
						<div className="invoice-generator-items" aria-hidden="true">
							<span>Description</span><span>Qty</span><span>Unit price</span><span />
						</div>
						{receipt.items.map((item, index) => (
							<div className="invoice-generator-items" key={index}>
								<input aria-label={`Receipt item ${index + 1} description`} maxLength={500} value={item.description} onChange={(event) => updateItem(index, 'description', event.target.value)} />
								<input aria-label={`Receipt item ${index + 1} quantity`} type="number" min="0.001" step="any" value={Number.isFinite(item.quantity) ? item.quantity : ''} onChange={(event) => updateItem(index, 'quantity', event.target.value)} />
								<input aria-label={`Receipt item ${index + 1} unit price`} type="number" min="0" step="0.01" value={Number.isFinite(item.unitPrice) ? item.unitPrice : ''} onChange={(event) => updateItem(index, 'unitPrice', event.target.value)} />
								<button className="tool-button secondary" type="button" aria-label={`Remove receipt item ${index + 1}`} disabled={receipt.items.length === 1} onClick={() => updateField('items', receipt.items.filter((_, itemIndex) => itemIndex !== index))}>×</button>
							</div>
						))}
						<button className="tool-button secondary" type="button" disabled={receipt.items.length >= INVOICE_GENERATOR_MAX_ITEMS} onClick={() => updateField('items', [...receipt.items, { description: '', quantity: 1, unitPrice: 0 }])}>Add paid item</button>
						{receipt.items.length >= INVOICE_GENERATOR_MAX_ITEMS && <small>Maximum of {INVOICE_GENERATOR_MAX_ITEMS} items.</small>}
					</div>
					<div className="calc-field">
						<label htmlFor="receipt-notes">Notes</label>
						<textarea id="receipt-notes" maxLength={500} rows={3} value={receipt.notes} onChange={(event) => updateField('notes', event.target.value)} placeholder="Optional receipt note" />
					</div>
				</div>

				<section className="invoice-generator-preview" aria-label="Live receipt preview">
					<header className="invoice-generator-header">
						<div><p className="invoice-generator-kicker">PAID TO</p><h2>{receipt.sellerName || 'Your Business'}</h2><p>{receipt.sellerDetails || 'Your address and contact details'}</p></div>
						<div className="invoice-generator-title"><h2>RECEIPT</h2><strong>{receipt.receiptNumber || 'Receipt number'}</strong></div>
					</header>
					<div className="invoice-generator-parties">
						<div><p className="invoice-generator-kicker">RECEIVED FROM</p><strong>{receipt.customerName || 'Customer name'}</strong><p>{receipt.customerDetails || 'Customer address and details'}</p></div>
						<div><p><strong>Payment date</strong> {receipt.receiptDate || '—'}</p><p><strong>Method</strong> {receipt.paymentMethod}</p>{receipt.reference && <p><strong>Reference</strong> {receipt.reference}</p>}</div>
					</div>
					<div className="invoice-generator-table-wrap">
						<table className="invoice-generator-table">
							<thead><tr><th>Description</th><th>Qty</th><th>Unit price</th><th>Amount</th></tr></thead>
							<tbody>{receipt.items.map((item, index) => {
								const amount = Number.isFinite(item.quantity * item.unitPrice) ? Math.round(item.quantity * item.unitPrice * 100) / 100 : 0;
								return <tr key={index}><td>{item.description || '—'}</td><td>{Number.isFinite(item.quantity) ? item.quantity : '—'}</td><td>{displayMoney(Number.isFinite(item.unitPrice) ? item.unitPrice : 0)}</td><td>{displayMoney(amount)}</td></tr>;
							})}</tbody>
						</table>
					</div>
					<div className="invoice-generator-summary">
						<p><span>Subtotal</span><strong>{totals.value ? displayMoney(totals.value.subtotal) : '—'}</strong></p>
						<p><span>Tax ({Number.isFinite(receipt.taxRate) ? receipt.taxRate : 0}%)</span><strong>{totals.value ? displayMoney(totals.value.taxAmount) : '—'}</strong></p>
						<p className="invoice-generator-total"><span>Amount received</span><strong>{totals.value ? displayMoney(totals.value.total) : '—'}</strong></p>
					</div>
					{receipt.notes && <div className="invoice-generator-notes"><p className="invoice-generator-kicker">NOTES</p><p>{receipt.notes}</p></div>}
					{totals.error && <p className="tool-message error" role="status">{totals.error}</p>}
				</section>
			</div>
			<div className="tool-actions">
				<button className="tool-button" type="button" disabled={busy || Boolean(totals.error)} onClick={downloadPdf}>{busy ? 'Creating PDF…' : 'Download receipt PDF'}</button>
			</div>
			<p className="tool-message" role="status">{message}</p>
			<p className="invoice-generator-disclaimer">This receipt records the payment details you enter. Confirm payment has been received before issuing it.</p>
		</div>
	);
}
