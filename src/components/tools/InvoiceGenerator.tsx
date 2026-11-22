import { useMemo, useState } from 'react';
import {
	calculateInvoiceGeneratorTotals,
	createInvoicePdf,
	formatInvoiceMoney,
	INVOICE_GENERATOR_MAX_ITEMS,
	INVOICE_GENERATOR_MAX_NAME_LENGTH,
	INVOICE_GENERATOR_MAX_NUMBER_LENGTH,
	type InvoiceGeneratorInput,
	type InvoiceGeneratorItem,
} from '../../engines/invoice-generator';
import { triggerDownload } from '../../engines/pdf';

function localDateString(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

function initialInvoice(): InvoiceGeneratorInput {
	const today = new Date();
	const dueDate = new Date(today);
	dueDate.setDate(dueDate.getDate() + 14);
	return {
		sellerName: 'Your Business',
		sellerDetails: '',
		customerName: '',
		customerDetails: '',
		invoiceNumber: `INV-${localDateString(today).replaceAll('-', '')}-001`,
		issueDate: localDateString(today),
		dueDate: localDateString(dueDate),
		currency: 'NGN',
		taxRate: 0,
		notes: '',
		items: [{ description: 'Service or product', quantity: 1, unitPrice: 0 }],
	};
}

function safeFilename(value: string): string {
	const name = value.trim().replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 60);
	return `${name || 'invoice'}.pdf`;
}

export default function InvoiceGenerator() {
	const [invoice, setInvoice] = useState(initialInvoice);
	const [message, setMessage] = useState('Your invoice details stay in this browser.');
	const [busy, setBusy] = useState(false);
	const totals = useMemo(() => {
		try {
			return { value: calculateInvoiceGeneratorTotals(invoice.items, invoice.taxRate), error: '' };
		} catch (error) {
			return { value: null, error: error instanceof Error ? error.message : 'Could not calculate invoice totals.' };
		}
	}, [invoice.items, invoice.taxRate]);

	const updateField = <K extends keyof InvoiceGeneratorInput>(key: K, value: InvoiceGeneratorInput[K]) => {
		setInvoice((current) => ({ ...current, [key]: value }));
		setMessage('');
	};

	const updateItem = (index: number, key: keyof InvoiceGeneratorItem, value: string) => {
		setInvoice((current) => ({
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
			const bytes = await createInvoicePdf(invoice);
			triggerDownload(new Blob([bytes], { type: 'application/pdf' }), safeFilename(invoice.invoiceNumber));
			setMessage('Invoice PDF downloaded.');
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Could not create the invoice PDF.');
		} finally {
			setBusy(false);
		}
	};

	const displayMoney = (value: number) => {
		try {
			return formatInvoiceMoney(value, invoice.currency);
		} catch {
			return `${invoice.currency} ${value.toFixed(2)}`;
		}
	};

	return (
		<div>
			<div className="invoice-columns">
				<div className="invoice-form invoice-generator-form">
					<div className="calc-fields">
						<div className="calc-field">
							<label htmlFor="generator-seller">Your business name</label>
							<input id="generator-seller" maxLength={INVOICE_GENERATOR_MAX_NAME_LENGTH} value={invoice.sellerName} onChange={(event) => updateField('sellerName', event.target.value)} />
						</div>
						<div className="calc-field">
							<label htmlFor="generator-seller-details">Your address and contact details</label>
							<textarea id="generator-seller-details" maxLength={500} rows={3} value={invoice.sellerDetails} onChange={(event) => updateField('sellerDetails', event.target.value)} placeholder="Address, email, phone, tax ID" />
						</div>
						<div className="calc-field">
							<label htmlFor="generator-customer">Customer / bill to</label>
							<input id="generator-customer" maxLength={INVOICE_GENERATOR_MAX_NAME_LENGTH} value={invoice.customerName} onChange={(event) => updateField('customerName', event.target.value)} />
						</div>
						<div className="calc-field">
							<label htmlFor="generator-customer-details">Customer address and details</label>
							<textarea id="generator-customer-details" maxLength={500} rows={3} value={invoice.customerDetails} onChange={(event) => updateField('customerDetails', event.target.value)} placeholder="Address, email, phone, tax ID" />
						</div>
						<div className="calc-field">
							<label htmlFor="generator-number">Invoice number</label>
							<input id="generator-number" maxLength={INVOICE_GENERATOR_MAX_NUMBER_LENGTH} value={invoice.invoiceNumber} onChange={(event) => updateField('invoiceNumber', event.target.value)} />
						</div>
						<div className="invoice-generator-dates">
							<div className="calc-field">
								<label htmlFor="generator-issue-date">Issue date</label>
								<input id="generator-issue-date" type="date" value={invoice.issueDate} onChange={(event) => updateField('issueDate', event.target.value)} />
							</div>
							<div className="calc-field">
								<label htmlFor="generator-due-date">Due date</label>
								<input id="generator-due-date" type="date" value={invoice.dueDate} onChange={(event) => updateField('dueDate', event.target.value)} />
							</div>
						</div>
						<div className="invoice-generator-dates">
							<div className="calc-field">
								<label htmlFor="generator-currency">Currency</label>
								<select id="generator-currency" value={invoice.currency} onChange={(event) => updateField('currency', event.target.value)}>
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
							<div className="calc-field">
								<label htmlFor="generator-tax">Tax rate</label>
								<div className="calc-input-suffix">
									<input id="generator-tax" type="number" min="0" max="100" step="0.01" value={Number.isFinite(invoice.taxRate) ? invoice.taxRate : ''} onChange={(event) => updateField('taxRate', event.target.value === '' ? Number.NaN : Number(event.target.value))} />
									<span>%</span>
								</div>
							</div>
						</div>
					</div>

					<div className="invoice-generator-lines">
						<strong>Line items</strong>
						<div className="invoice-generator-items" aria-hidden="true">
							<span>Description</span><span>Qty</span><span>Unit price</span><span />
						</div>
						{invoice.items.map((item, index) => (
							<div className="invoice-generator-items" key={index}>
								<input aria-label={`Item ${index + 1} description`} maxLength={500} value={item.description} onChange={(event) => updateItem(index, 'description', event.target.value)} />
								<input aria-label={`Item ${index + 1} quantity`} type="number" min="0.001" step="any" value={Number.isFinite(item.quantity) ? item.quantity : ''} onChange={(event) => updateItem(index, 'quantity', event.target.value)} />
								<input aria-label={`Item ${index + 1} unit price`} type="number" min="0" step="0.01" value={Number.isFinite(item.unitPrice) ? item.unitPrice : ''} onChange={(event) => updateItem(index, 'unitPrice', event.target.value)} />
								<button className="tool-button secondary" type="button" aria-label={`Remove item ${index + 1}`} disabled={invoice.items.length === 1} onClick={() => updateField('items', invoice.items.filter((_, itemIndex) => itemIndex !== index))}>×</button>
							</div>
						))}
						<button className="tool-button secondary" type="button" disabled={invoice.items.length >= INVOICE_GENERATOR_MAX_ITEMS} onClick={() => updateField('items', [...invoice.items, { description: '', quantity: 1, unitPrice: 0 }])}>Add line item</button>
						{invoice.items.length >= INVOICE_GENERATOR_MAX_ITEMS && <small>Maximum of {INVOICE_GENERATOR_MAX_ITEMS} line items.</small>}
					</div>
					<div className="calc-field">
						<label htmlFor="generator-notes">Notes and payment instructions</label>
						<textarea id="generator-notes" maxLength={500} rows={4} value={invoice.notes} onChange={(event) => updateField('notes', event.target.value)} placeholder="Payment method, bank details, or a thank-you message" />
					</div>
				</div>

				<section className="invoice-generator-preview" aria-label="Live invoice preview">
					<header className="invoice-generator-header">
						<div><p className="invoice-generator-kicker">FROM</p><h2>{invoice.sellerName || 'Your Business'}</h2><p>{invoice.sellerDetails || 'Your address and contact details'}</p></div>
						<div className="invoice-generator-title"><h2>INVOICE</h2><strong>{invoice.invoiceNumber || 'Invoice number'}</strong></div>
					</header>
					<div className="invoice-generator-parties">
						<div><p className="invoice-generator-kicker">BILL TO</p><strong>{invoice.customerName || 'Customer name'}</strong><p>{invoice.customerDetails || 'Customer address and details'}</p></div>
						<div><p><strong>Issue date</strong> {invoice.issueDate || '—'}</p><p><strong>Due date</strong> {invoice.dueDate || '—'}</p></div>
					</div>
					<div className="invoice-generator-table-wrap">
						<table className="invoice-generator-table">
							<thead><tr><th>Description</th><th>Qty</th><th>Unit price</th><th>Amount</th></tr></thead>
							<tbody>{invoice.items.map((item, index) => {
								const amount = Number.isFinite(item.quantity * item.unitPrice) ? Math.round(item.quantity * item.unitPrice * 100) / 100 : 0;
								return <tr key={index}><td>{item.description || '—'}</td><td>{Number.isFinite(item.quantity) ? item.quantity : '—'}</td><td>{displayMoney(Number.isFinite(item.unitPrice) ? item.unitPrice : 0)}</td><td>{displayMoney(amount)}</td></tr>;
							})}</tbody>
						</table>
					</div>
					<div className="invoice-generator-summary">
						<p><span>Subtotal</span><strong>{totals.value ? displayMoney(totals.value.subtotal) : '—'}</strong></p>
						<p><span>Tax ({Number.isFinite(invoice.taxRate) ? invoice.taxRate : 0}%)</span><strong>{totals.value ? displayMoney(totals.value.taxAmount) : '—'}</strong></p>
						<p className="invoice-generator-total"><span>Total due</span><strong>{totals.value ? displayMoney(totals.value.total) : '—'}</strong></p>
					</div>
					{invoice.notes && <div className="invoice-generator-notes"><p className="invoice-generator-kicker">NOTES</p><p>{invoice.notes}</p></div>}
					{totals.error && <p className="tool-message error" role="status">{totals.error}</p>}
				</section>
			</div>
			<div className="tool-actions">
				<button className="tool-button" type="button" disabled={busy || Boolean(totals.error)} onClick={downloadPdf}>{busy ? 'Creating PDF…' : 'Download invoice PDF'}</button>
			</div>
			<p className="tool-message" role="status">{message}</p>
			<p className="invoice-generator-disclaimer">This tool creates a general invoice template. Check local tax, record-keeping, and invoicing requirements before sending.</p>
		</div>
	);
}
