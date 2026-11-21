import { useState, type CSSProperties } from 'react';
import { calculateInvoice, type InvoiceItem } from '../../engines/invoice';

export default function InvoiceBrandingDesigner() {
	const [brand, setBrand] = useState('Your Company');
	const [invoiceNumber, setInvoiceNumber] = useState('INV-001');
	const [client, setClient] = useState('Client name');
	const [colour, setColour] = useState('#356b54');
	const [taxRate, setTaxRate] = useState('0');
	const [items, setItems] = useState<InvoiceItem[]>([{ description: 'Design service', quantity: 1, rate: 100 }]);
	const [message, setMessage] = useState('');
	const taxValue = Number(taxRate);
	let totals = { subtotal: 0, tax: 0, total: 0 };
	let error = '';
	try { totals = calculateInvoice(items, taxValue); } catch (cause) { error = cause instanceof Error ? cause.message : 'Unable to calculate totals.'; }

	const updateItem = (index: number, key: keyof InvoiceItem, value: string) => setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: key === 'description' ? value : Number(value) } : item));
	const printInvoice = () => window.print();
	const downloadHtml = () => {
		const safeColour = /^#[0-9a-f]{6}$/i.test(colour) ? colour : '#356b54';
		const rows = items.map((item) => `<tr><td>${item.description.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</td><td>${item.quantity}</td><td>${item.rate.toFixed(2)}</td><td>${(item.quantity * item.rate).toFixed(2)}</td></tr>`).join('');
		const html = `<!doctype html><html><head><title>${invoiceNumber}</title><style>body{font-family:Arial,sans-serif;margin:40px}h1{color:${safeColour}}table{width:100%;border-collapse:collapse}th,td{border-bottom:1px solid #ddd;padding:8px;text-align:left}.totals{text-align:right;margin-top:20px}@media print{body{margin:15mm}}</style></head><body><h1>${brand}</h1><strong>${invoiceNumber}</strong><p>Bill to: ${client}</p><table><thead><tr><th>Description</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead><tbody>${rows}</tbody></table><div class="totals"><p>Subtotal: ${totals.subtotal.toFixed(2)}</p><p>Tax: ${totals.tax.toFixed(2)}</p><h2>Total: ${totals.total.toFixed(2)}</h2></div></body></html>`;
		const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
		const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href=url; link.download=`${invoiceNumber || 'invoice'}.html`; link.click(); URL.revokeObjectURL(url); setMessage('Invoice HTML downloaded.');
	};

	return (
		<div>
			<div className="invoice-columns">
				<div className="invoice-form">
					<div className="calc-fields"><div className="calc-field"><label htmlFor="invoice-brand">Brand / company</label><input id="invoice-brand" value={brand} onChange={(event) => setBrand(event.target.value)} /></div><div className="calc-field"><label htmlFor="invoice-number">Invoice number</label><input id="invoice-number" value={invoiceNumber} onChange={(event) => setInvoiceNumber(event.target.value)} /></div><div className="calc-field"><label htmlFor="invoice-client">Bill to</label><input id="invoice-client" value={client} onChange={(event) => setClient(event.target.value)} /></div><div className="calc-field"><label htmlFor="invoice-tax">Tax rate</label><div className="calc-input-suffix"><input id="invoice-tax" type="number" min="0" step="any" value={taxRate} onChange={(event) => setTaxRate(event.target.value)} /><span>%</span></div></div><div className="calc-field"><label htmlFor="invoice-colour">Accent colour</label><input id="invoice-colour" type="color" value={colour} onChange={(event) => setColour(event.target.value)} /></div></div>
					<div className="invoice-items"><strong>Invoice items</strong>{items.map((item, index) => <div className="invoice-item" key={index}><input aria-label={`Item ${index + 1} description`} value={item.description} onChange={(event) => updateItem(index, 'description', event.target.value)} /><input aria-label={`Item ${index + 1} quantity`} type="number" min="0" step="any" value={item.quantity} onChange={(event) => updateItem(index, 'quantity', event.target.value)} /><input aria-label={`Item ${index + 1} rate`} type="number" min="0" step="any" value={item.rate} onChange={(event) => updateItem(index, 'rate', event.target.value)} /></div>)}</div>
					<button className="tool-button secondary" type="button" onClick={() => setItems((current) => [...current, { description: 'Additional service', quantity: 1, rate: 0 }])}>Add item</button>
				</div>
				<div className="invoice-preview" style={{ '--invoice-accent': colour } as CSSProperties}><header><h2>{brand || 'Your Company'}</h2><strong>{invoiceNumber || 'INV-001'}</strong></header><p><strong>Bill to:</strong> {client || 'Client name'}</p><table><thead><tr><th>Description</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead><tbody>{items.map((item,index)=><tr key={index}><td>{item.description}</td><td>{item.quantity}</td><td>{item.rate.toFixed(2)}</td><td>{(item.quantity * item.rate).toFixed(2)}</td></tr>)}</tbody></table><div className="invoice-totals"><p>Subtotal: {totals.subtotal.toFixed(2)}</p><p>Tax: {totals.tax.toFixed(2)}</p><h3>Total: {totals.total.toFixed(2)}</h3></div></div>
			</div>
			<div className="tool-actions"><button className="tool-button" type="button" onClick={printInvoice}>Print / Save PDF</button><button className="tool-button secondary" type="button" onClick={downloadHtml}>Download HTML</button></div>
			<p className={`tool-message${error ? ' error' : ''}`} role="status">{error || message || 'Invoice preview and calculations stay on this device.'}</p>
		</div>
	);
}
