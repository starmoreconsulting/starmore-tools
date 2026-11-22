import { useMemo, useState } from 'react';
import {
	calculateQuotationTotals,
	createQuotationDocument,
	type QuotationGeneratorInput,
} from '../../engines/quotation-generator';
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

function initialQuotation(): QuotationGeneratorInput {
	const today = new Date();
	const validUntil = new Date(today);
	validUntil.setDate(validUntil.getDate() + 30);
	return {
		sellerName: 'Your Business',
		sellerDetails: '',
		customerName: '',
		customerDetails: '',
		invoiceNumber: `QUO-${localDateString(today).replaceAll('-', '')}-001`,
		issueDate: localDateString(today),
		dueDate: localDateString(validUntil),
		currency: 'NGN',
		taxRate: 0,
		notes: '',
		items: [{ description: 'Service or product', quantity: 1, unitPrice: 0 }],
	};
}

function safeFilename(value: string): string {
	const name = value.trim().replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 60);
	return `${name || 'quotation'}.pdf`;
}

export default function QuotationGenerator() {
	const [quotation, setQuotation] = useState(initialQuotation);
	const [message, setMessage] = useState('Your quotation details stay in this browser.');
	const [busy, setBusy] = useState(false);
	const totals = useMemo(() => {
		try {
			return { value: calculateQuotationTotals(quotation.items, quotation.taxRate), error: '' };
		} catch (error) {
			return { value: null, error: error instanceof Error ? error.message : 'Could not calculate quotation totals.' };
		}
	}, [quotation.items, quotation.taxRate]);

	const updateField = <K extends keyof QuotationGeneratorInput>(key: K, value: QuotationGeneratorInput[K]) => {
		setQuotation((current) => ({ ...current, [key]: value }));
		setMessage('');
	};

	const updateItem = (index: number, key: keyof InvoiceGeneratorItem, value: string) => {
		setQuotation((current) => ({
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
			const bytes = await createQuotationDocument(quotation);
			triggerDownload(new Blob([bytes], { type: 'application/pdf' }), safeFilename(quotation.invoiceNumber));
			setMessage('Quotation PDF downloaded.');
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Could not create the quotation PDF.');
		} finally {
			setBusy(false);
		}
	};

	const displayMoney = (value: number) => {
		try {
			return formatInvoiceMoney(value, quotation.currency);
		} catch {
			return `${quotation.currency} ${value.toFixed(2)}`;
		}
	};

	return (
		<div>
			<div className="invoice-columns">
				<div className="invoice-form invoice-generator-form">
					<div className="calc-fields">
						<div className="calc-field">
							<label htmlFor="quotation-seller">Your business name</label>
							<input id="quotation-seller" maxLength={INVOICE_GENERATOR_MAX_NAME_LENGTH} value={quotation.sellerName} onChange={(event) => updateField('sellerName', event.target.value)} />
						</div>
						<div className="calc-field">
							<label htmlFor="quotation-seller-details">Your address and contact details</label>
							<textarea id="quotation-seller-details" maxLength={500} rows={3} value={quotation.sellerDetails} onChange={(event) => updateField('sellerDetails', event.target.value)} placeholder="Address, email, phone, tax ID" />
						</div>
						<div className="calc-field">
							<label htmlFor="quotation-customer">Prepared for</label>
							<input id="quotation-customer" maxLength={INVOICE_GENERATOR_MAX_NAME_LENGTH} value={quotation.customerName} onChange={(event) => updateField('customerName', event.target.value)} />
						</div>
						<div className="calc-field">
							<label htmlFor="quotation-customer-details">Customer address and details</label>
							<textarea id="quotation-customer-details" maxLength={500} rows={3} value={quotation.customerDetails} onChange={(event) => updateField('customerDetails', event.target.value)} placeholder="Address, email, phone, tax ID" />
						</div>
						<div className="calc-field">
							<label htmlFor="quotation-number">Quote number</label>
							<input id="quotation-number" maxLength={INVOICE_GENERATOR_MAX_NUMBER_LENGTH} value={quotation.invoiceNumber} onChange={(event) => updateField('invoiceNumber', event.target.value)} />
						</div>
						<div className="invoice-generator-dates">
							<div className="calc-field">
								<label htmlFor="quotation-date">Quote date</label>
								<input id="quotation-date" type="date" value={quotation.issueDate} onChange={(event) => updateField('issueDate', event.target.value)} />
							</div>
							<div className="calc-field">
								<label htmlFor="quotation-valid-until">Valid until</label>
								<input id="quotation-valid-until" type="date" value={quotation.dueDate} onChange={(event) => updateField('dueDate', event.target.value)} />
							</div>
						</div>
						<div className="invoice-generator-dates">
							<div className="calc-field">
								<label htmlFor="quotation-currency">Currency</label>
								<select id="quotation-currency" value={quotation.currency} onChange={(event) => updateField('currency', event.target.value)}>
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
								<label htmlFor="quotation-tax">Tax rate</label>
								<div className="calc-input-suffix">
									<input id="quotation-tax" type="number" min="0" max="100" step="0.01" value={Number.isFinite(quotation.taxRate) ? quotation.taxRate : ''} onChange={(event) => updateField('taxRate', event.target.value === '' ? Number.NaN : Number(event.target.value))} />
									<span>%</span>
								</div>
							</div>
						</div>
					</div>

					<div className="invoice-generator-lines">
						<strong>Quoted items</strong>
						<div className="invoice-generator-items" aria-hidden="true">
							<span>Description</span><span>Qty</span><span>Unit price</span><span />
						</div>
						{quotation.items.map((item, index) => (
							<div className="invoice-generator-items" key={index}>
								<input aria-label={`Quoted item ${index + 1} description`} maxLength={500} value={item.description} onChange={(event) => updateItem(index, 'description', event.target.value)} />
								<input aria-label={`Quoted item ${index + 1} quantity`} type="number" min="0.001" step="any" value={Number.isFinite(item.quantity) ? item.quantity : ''} onChange={(event) => updateItem(index, 'quantity', event.target.value)} />
								<input aria-label={`Quoted item ${index + 1} unit price`} type="number" min="0" step="0.01" value={Number.isFinite(item.unitPrice) ? item.unitPrice : ''} onChange={(event) => updateItem(index, 'unitPrice', event.target.value)} />
								<button className="tool-button secondary" type="button" aria-label={`Remove quoted item ${index + 1}`} disabled={quotation.items.length === 1} onClick={() => updateField('items', quotation.items.filter((_, itemIndex) => itemIndex !== index))}>×</button>
							</div>
						))}
						<button className="tool-button secondary" type="button" disabled={quotation.items.length >= INVOICE_GENERATOR_MAX_ITEMS} onClick={() => updateField('items', [...quotation.items, { description: '', quantity: 1, unitPrice: 0 }])}>Add quoted item</button>
						{quotation.items.length >= INVOICE_GENERATOR_MAX_ITEMS && <small>Maximum of {INVOICE_GENERATOR_MAX_ITEMS} quoted items.</small>}
					</div>
					<div className="calc-field">
						<label htmlFor="quotation-notes">Notes and terms</label>
						<textarea id="quotation-notes" maxLength={500} rows={4} value={quotation.notes} onChange={(event) => updateField('notes', event.target.value)} placeholder="Scope, exclusions, payment terms, or validity conditions" />
					</div>
				</div>

				<section className="invoice-generator-preview" aria-label="Live quotation preview">
					<header className="invoice-generator-header">
						<div><p className="invoice-generator-kicker">PREPARED BY</p><h2>{quotation.sellerName || 'Your Business'}</h2><p>{quotation.sellerDetails || 'Your address and contact details'}</p></div>
						<div className="invoice-generator-title"><h2>QUOTATION</h2><strong>{quotation.invoiceNumber || 'Quote number'}</strong></div>
					</header>
					<div className="invoice-generator-parties">
						<div><p className="invoice-generator-kicker">PREPARED FOR</p><strong>{quotation.customerName || 'Customer name'}</strong><p>{quotation.customerDetails || 'Customer address and details'}</p></div>
						<div><p><strong>Quote date</strong> {quotation.issueDate || '—'}</p><p><strong>Valid until</strong> {quotation.dueDate || '—'}</p></div>
					</div>
					<div className="invoice-generator-table-wrap">
						<table className="invoice-generator-table">
							<thead><tr><th>Description</th><th>Qty</th><th>Unit price</th><th>Amount</th></tr></thead>
							<tbody>{quotation.items.map((item, index) => {
								const amount = Number.isFinite(item.quantity * item.unitPrice) ? Math.round(item.quantity * item.unitPrice * 100) / 100 : 0;
								return <tr key={index}><td>{item.description || '—'}</td><td>{Number.isFinite(item.quantity) ? item.quantity : '—'}</td><td>{displayMoney(Number.isFinite(item.unitPrice) ? item.unitPrice : 0)}</td><td>{displayMoney(amount)}</td></tr>;
							})}</tbody>
						</table>
					</div>
					<div className="invoice-generator-summary">
						<p><span>Subtotal</span><strong>{totals.value ? displayMoney(totals.value.subtotal) : '—'}</strong></p>
						<p><span>Tax ({Number.isFinite(quotation.taxRate) ? quotation.taxRate : 0}%)</span><strong>{totals.value ? displayMoney(totals.value.taxAmount) : '—'}</strong></p>
						<p className="invoice-generator-total"><span>Total quoted</span><strong>{totals.value ? displayMoney(totals.value.total) : '—'}</strong></p>
					</div>
					{quotation.notes && <div className="invoice-generator-notes"><p className="invoice-generator-kicker">NOTES / TERMS</p><p>{quotation.notes}</p></div>}
					{totals.error && <p className="tool-message error" role="status">{totals.error}</p>}
				</section>
			</div>
			<div className="tool-actions">
				<button className="tool-button" type="button" disabled={busy || Boolean(totals.error)} onClick={downloadPdf}>{busy ? 'Creating PDF…' : 'Download quotation PDF'}</button>
			</div>
			<p className="tool-message" role="status">{message}</p>
			<p className="invoice-generator-disclaimer">A quotation is an estimate, not a payment request. Review the scope, expiry date, and applicable requirements before sending.</p>
		</div>
	);
}
