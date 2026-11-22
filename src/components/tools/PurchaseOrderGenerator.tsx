import { useMemo, useState } from 'react';
import {
	calculatePurchaseOrderTotals,
	createPurchaseOrderDocument,
	type PurchaseOrderInput,
} from '../../engines/purchase-order-generator';
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

function initialOrder(): PurchaseOrderInput {
	const today = new Date();
	const expectedDeliveryDate = new Date(today);
	expectedDeliveryDate.setDate(expectedDeliveryDate.getDate() + 14);
	return {
		buyerName: 'Your Business',
		buyerDetails: '',
		supplierName: '',
		supplierDetails: '',
		orderNumber: `PO-${localDateString(today).replaceAll('-', '')}-001`,
		orderDate: localDateString(today),
		expectedDeliveryDate: localDateString(expectedDeliveryDate),
		deliveryAddress: '',
		deliveryMethod: '',
		currency: 'NGN',
		taxRate: 0,
		notes: '',
		items: [{ description: 'Product or service', quantity: 1, unitPrice: 0 }],
	};
}

function safeFilename(value: string): string {
	const name = value.trim().replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 60);
	return `${name || 'purchase-order'}.pdf`;
}

export default function PurchaseOrderGenerator() {
	const [order, setOrder] = useState(initialOrder);
	const [message, setMessage] = useState('Your order details stay in this browser.');
	const [busy, setBusy] = useState(false);
	const totals = useMemo(() => {
		try {
			return { value: calculatePurchaseOrderTotals(order.items, order.taxRate), error: '' };
		} catch (error) {
			return { value: null, error: error instanceof Error ? error.message : 'Could not calculate order totals.' };
		}
	}, [order.items, order.taxRate]);

	const updateField = <K extends keyof PurchaseOrderInput>(key: K, value: PurchaseOrderInput[K]) => {
		setOrder((current) => ({ ...current, [key]: value }));
		setMessage('');
	};

	const updateItem = (index: number, key: keyof InvoiceGeneratorItem, value: string) => {
		setOrder((current) => ({
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
			const bytes = await createPurchaseOrderDocument(order);
			triggerDownload(new Blob([bytes], { type: 'application/pdf' }), safeFilename(order.orderNumber));
			setMessage('Purchase order PDF downloaded.');
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Could not create the purchase order PDF.');
		} finally {
			setBusy(false);
		}
	};

	const displayMoney = (value: number) => {
		try {
			return formatInvoiceMoney(value, order.currency);
		} catch {
			return `${order.currency} ${value.toFixed(2)}`;
		}
	};

	return (
		<div>
			<div className="invoice-columns">
				<div className="invoice-form invoice-generator-form">
					<div className="calc-fields">
						<div className="calc-field">
							<label htmlFor="po-buyer">Buyer / your business</label>
							<input id="po-buyer" maxLength={INVOICE_GENERATOR_MAX_NAME_LENGTH} value={order.buyerName} onChange={(event) => updateField('buyerName', event.target.value)} />
						</div>
						<div className="calc-field">
							<label htmlFor="po-buyer-details">Buyer address and contact details</label>
							<textarea id="po-buyer-details" maxLength={500} rows={3} value={order.buyerDetails} onChange={(event) => updateField('buyerDetails', event.target.value)} placeholder="Address, email, phone, tax ID" />
						</div>
						<div className="calc-field">
							<label htmlFor="po-supplier">Supplier</label>
							<input id="po-supplier" maxLength={INVOICE_GENERATOR_MAX_NAME_LENGTH} value={order.supplierName} onChange={(event) => updateField('supplierName', event.target.value)} />
						</div>
						<div className="calc-field">
							<label htmlFor="po-supplier-details">Supplier address and contact details</label>
							<textarea id="po-supplier-details" maxLength={500} rows={3} value={order.supplierDetails} onChange={(event) => updateField('supplierDetails', event.target.value)} placeholder="Address, email, phone, tax ID" />
						</div>
						<div className="invoice-generator-dates">
							<div className="calc-field">
								<label htmlFor="po-number">Purchase order number</label>
								<input id="po-number" maxLength={INVOICE_GENERATOR_MAX_NUMBER_LENGTH} value={order.orderNumber} onChange={(event) => updateField('orderNumber', event.target.value)} />
							</div>
							<div className="calc-field">
								<label htmlFor="po-date">Order date</label>
								<input id="po-date" type="date" value={order.orderDate} onChange={(event) => updateField('orderDate', event.target.value)} />
							</div>
						</div>
						<div className="invoice-generator-dates">
							<div className="calc-field">
								<label htmlFor="po-delivery-date">Expected delivery date</label>
								<input id="po-delivery-date" type="date" value={order.expectedDeliveryDate} onChange={(event) => updateField('expectedDeliveryDate', event.target.value)} />
							</div>
							<div className="calc-field">
								<label htmlFor="po-currency">Currency</label>
								<select id="po-currency" value={order.currency} onChange={(event) => updateField('currency', event.target.value)}>
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
								<label htmlFor="po-delivery-address">Deliver to</label>
								<textarea id="po-delivery-address" maxLength={500} rows={3} value={order.deliveryAddress} onChange={(event) => updateField('deliveryAddress', event.target.value)} placeholder="Receiving address or location" />
							</div>
							<div className="calc-field">
								<label htmlFor="po-delivery-method">Delivery method</label>
								<input id="po-delivery-method" maxLength={500} value={order.deliveryMethod} onChange={(event) => updateField('deliveryMethod', event.target.value)} placeholder="Courier, pickup, freight…" />
							</div>
						</div>
						<div className="calc-field">
							<label htmlFor="po-tax">Tax rate (if applicable)</label>
							<div className="calc-input-suffix">
								<input id="po-tax" type="number" min="0" max="100" step="0.01" value={Number.isFinite(order.taxRate) ? order.taxRate : ''} onChange={(event) => updateField('taxRate', event.target.value === '' ? Number.NaN : Number(event.target.value))} />
								<span>%</span>
							</div>
						</div>
					</div>

					<div className="invoice-generator-lines">
						<strong>Items to order</strong>
						<div className="invoice-generator-items" aria-hidden="true">
							<span>Description</span><span>Qty</span><span>Unit price</span><span />
						</div>
						{order.items.map((item, index) => (
							<div className="invoice-generator-items" key={index}>
								<input aria-label={`Order item ${index + 1} description`} maxLength={500} value={item.description} onChange={(event) => updateItem(index, 'description', event.target.value)} />
								<input aria-label={`Order item ${index + 1} quantity`} type="number" min="0.001" step="any" value={Number.isFinite(item.quantity) ? item.quantity : ''} onChange={(event) => updateItem(index, 'quantity', event.target.value)} />
								<input aria-label={`Order item ${index + 1} unit price`} type="number" min="0" step="0.01" value={Number.isFinite(item.unitPrice) ? item.unitPrice : ''} onChange={(event) => updateItem(index, 'unitPrice', event.target.value)} />
								<button className="tool-button secondary" type="button" aria-label={`Remove order item ${index + 1}`} disabled={order.items.length === 1} onClick={() => updateField('items', order.items.filter((_, itemIndex) => itemIndex !== index))}>×</button>
							</div>
						))}
						<button className="tool-button secondary" type="button" disabled={order.items.length >= INVOICE_GENERATOR_MAX_ITEMS} onClick={() => updateField('items', [...order.items, { description: '', quantity: 1, unitPrice: 0 }])}>Add order item</button>
						{order.items.length >= INVOICE_GENERATOR_MAX_ITEMS && <small>Maximum of {INVOICE_GENERATOR_MAX_ITEMS} order items.</small>}
					</div>
					<div className="calc-field">
						<label htmlFor="po-notes">Order notes and terms</label>
						<textarea id="po-notes" maxLength={500} rows={4} value={order.notes} onChange={(event) => updateField('notes', event.target.value)} placeholder="Instructions, payment terms, or supplier notes" />
					</div>
				</div>

				<section className="invoice-generator-preview" aria-label="Live purchase order preview">
					<header className="invoice-generator-header">
						<div><p className="invoice-generator-kicker">ORDERED BY</p><h2>{order.buyerName || 'Your Business'}</h2><p>{order.buyerDetails || 'Buyer address and contact details'}</p></div>
						<div className="invoice-generator-title"><h2>PURCHASE ORDER</h2><strong>{order.orderNumber || 'Order number'}</strong></div>
					</header>
					<div className="invoice-generator-parties">
						<div><p className="invoice-generator-kicker">SUPPLIER</p><strong>{order.supplierName || 'Supplier name'}</strong><p>{order.supplierDetails || 'Supplier address and contact details'}</p></div>
						<div><p><strong>Order date</strong> {order.orderDate || '—'}</p><p><strong>Expected delivery</strong> {order.expectedDeliveryDate || '—'}</p></div>
					</div>
					<div className="invoice-generator-parties">
						<div><p className="invoice-generator-kicker">DELIVER TO</p><p>{order.deliveryAddress || 'Receiving address or location'}</p></div>
						<div><p><strong>Delivery method</strong> {order.deliveryMethod || 'As agreed'}</p><p><strong>Currency</strong> {order.currency}</p></div>
					</div>
					<div className="invoice-generator-table-wrap">
						<table className="invoice-generator-table">
							<thead><tr><th>Description</th><th>Qty</th><th>Unit price</th><th>Amount</th></tr></thead>
							<tbody>{order.items.map((item, index) => {
								const amount = Number.isFinite(item.quantity * item.unitPrice) ? Math.round(item.quantity * item.unitPrice * 100) / 100 : 0;
								return <tr key={index}><td>{item.description || '—'}</td><td>{Number.isFinite(item.quantity) ? item.quantity : '—'}</td><td>{displayMoney(Number.isFinite(item.unitPrice) ? item.unitPrice : 0)}</td><td>{displayMoney(amount)}</td></tr>;
							})}</tbody>
						</table>
					</div>
					<div className="invoice-generator-summary">
						<p><span>Subtotal</span><strong>{totals.value ? displayMoney(totals.value.subtotal) : '—'}</strong></p>
						<p><span>Tax ({Number.isFinite(order.taxRate) ? order.taxRate : 0}%)</span><strong>{totals.value ? displayMoney(totals.value.taxAmount) : '—'}</strong></p>
						<p className="invoice-generator-total"><span>Order total</span><strong>{totals.value ? displayMoney(totals.value.total) : '—'}</strong></p>
					</div>
					{order.notes && <div className="invoice-generator-notes"><p className="invoice-generator-kicker">ORDER NOTES / TERMS</p><p>{order.notes}</p></div>}
					{totals.error && <p className="tool-message error" role="status">{totals.error}</p>}
				</section>
			</div>
			<div className="tool-actions">
				<button className="tool-button" type="button" disabled={busy || Boolean(totals.error)} onClick={downloadPdf}>{busy ? 'Creating PDF…' : 'Download purchase order PDF'}</button>
			</div>
			<p className="tool-message" role="status">{message}</p>
			<p className="invoice-generator-disclaimer">A purchase order is a request to a supplier, not proof of payment. Confirm pricing, approval, and terms before sending.</p>
		</div>
	);
}
