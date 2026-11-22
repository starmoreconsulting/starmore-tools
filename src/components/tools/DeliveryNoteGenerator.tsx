import { useState } from 'react';
import {
	createDeliveryNotePdf,
	DELIVERY_NOTE_MAX_ITEMS,
	type DeliveryNoteInput,
	type DeliveryNoteItem,
} from '../../engines/delivery-note';
import { triggerDownload } from '../../engines/pdf';

function localDateString(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

function initialDeliveryNote(): DeliveryNoteInput {
	const today = localDateString(new Date());
	return {
		senderName: 'Your Business',
		senderDetails: '',
		recipientName: '',
		recipientDetails: '',
		noteNumber: `DN-${today.replaceAll('-', '')}-001`,
		dispatchDate: today,
		reference: '',
		carrier: '',
		deliveryAddress: '',
		items: [{ description: 'Product or service', quantity: 1, unit: 'item' }],
		notes: 'Please check the items against this delivery note upon receipt.',
	};
}

function safeFilename(value: string): string {
	const name = value.trim().replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 60);
	return `${name || 'delivery-note'}.pdf`;
}

export default function DeliveryNoteGenerator() {
	const [deliveryNote, setDeliveryNote] = useState(initialDeliveryNote);
	const [message, setMessage] = useState('Your delivery note details stay in this browser.');
	const [busy, setBusy] = useState(false);

	const updateField = <K extends keyof DeliveryNoteInput>(key: K, value: DeliveryNoteInput[K]) => {
		setDeliveryNote((current) => ({ ...current, [key]: value }));
		setMessage('');
	};

	const updateItem = (index: number, key: keyof DeliveryNoteItem, value: string) => {
		setDeliveryNote((current) => ({
			...current,
			items: current.items.map((item, itemIndex) => itemIndex === index
				? { ...item, [key]: key === 'quantity' ? value === '' ? Number.NaN : Number(value) : value }
				: item),
		}));
		setMessage('');
	};

	const downloadPdf = async () => {
		setBusy(true);
		setMessage('');
		try {
			const bytes = await createDeliveryNotePdf(deliveryNote);
			triggerDownload(new Blob([bytes], { type: 'application/pdf' }), safeFilename(deliveryNote.noteNumber));
			setMessage('Delivery note PDF downloaded.');
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Could not create the delivery note PDF.');
		} finally {
			setBusy(false);
		}
	};

	return (
		<div>
			<div className="invoice-columns">
				<div className="invoice-form invoice-generator-form">
					<div className="calc-fields">
						<div className="calc-field">
							<label htmlFor="delivery-sender">Sender / your business</label>
							<input id="delivery-sender" maxLength={120} value={deliveryNote.senderName} onChange={(event) => updateField('senderName', event.target.value)} />
						</div>
						<div className="calc-field">
							<label htmlFor="delivery-sender-details">Sender address and contact details</label>
							<textarea id="delivery-sender-details" maxLength={500} rows={3} value={deliveryNote.senderDetails} onChange={(event) => updateField('senderDetails', event.target.value)} placeholder="Address, email, phone" />
						</div>
						<div className="calc-field">
							<label htmlFor="delivery-recipient">Recipient</label>
							<input id="delivery-recipient" maxLength={120} value={deliveryNote.recipientName} onChange={(event) => updateField('recipientName', event.target.value)} />
						</div>
						<div className="calc-field">
							<label htmlFor="delivery-recipient-details">Recipient address and contact details</label>
							<textarea id="delivery-recipient-details" maxLength={500} rows={3} value={deliveryNote.recipientDetails} onChange={(event) => updateField('recipientDetails', event.target.value)} placeholder="Address, email, phone" />
						</div>
						<div className="invoice-generator-dates">
							<div className="calc-field">
								<label htmlFor="delivery-note-number">Delivery note number</label>
								<input id="delivery-note-number" maxLength={80} value={deliveryNote.noteNumber} onChange={(event) => updateField('noteNumber', event.target.value)} />
							</div>
							<div className="calc-field">
								<label htmlFor="delivery-dispatch-date">Dispatch date</label>
								<input id="delivery-dispatch-date" type="date" value={deliveryNote.dispatchDate} onChange={(event) => updateField('dispatchDate', event.target.value)} />
							</div>
						</div>
						<div className="invoice-generator-dates">
							<div className="calc-field">
								<label htmlFor="delivery-reference">Order / reference (optional)</label>
								<input id="delivery-reference" maxLength={500} value={deliveryNote.reference} onChange={(event) => updateField('reference', event.target.value)} />
							</div>
							<div className="calc-field">
								<label htmlFor="delivery-carrier">Carrier / delivery method</label>
								<input id="delivery-carrier" maxLength={500} value={deliveryNote.carrier} onChange={(event) => updateField('carrier', event.target.value)} placeholder="Courier, pickup, freight…" />
							</div>
						</div>
						<div className="calc-field">
							<label htmlFor="delivery-address">Deliver to</label>
							<textarea id="delivery-address" maxLength={500} rows={3} value={deliveryNote.deliveryAddress} onChange={(event) => updateField('deliveryAddress', event.target.value)} placeholder="Destination or receiving location" />
						</div>
					</div>

					<div className="invoice-generator-lines">
						<strong>Items being delivered</strong>
						<div className="delivery-note-items" aria-hidden="true">
							<span>Description</span><span>Qty</span><span>Unit</span><span />
						</div>
						{deliveryNote.items.map((item, index) => (
							<div className="delivery-note-items" key={index}>
								<input aria-label={`Delivery item ${index + 1} description`} maxLength={500} value={item.description} onChange={(event) => updateItem(index, 'description', event.target.value)} />
								<input aria-label={`Delivery item ${index + 1} quantity`} type="number" min="0.001" step="any" value={Number.isFinite(item.quantity) ? item.quantity : ''} onChange={(event) => updateItem(index, 'quantity', event.target.value)} />
								<input aria-label={`Delivery item ${index + 1} unit`} maxLength={40} value={item.unit} onChange={(event) => updateItem(index, 'unit', event.target.value)} placeholder="item" />
								<button className="tool-button secondary" type="button" aria-label={`Remove delivery item ${index + 1}`} disabled={deliveryNote.items.length === 1} onClick={() => updateField('items', deliveryNote.items.filter((_, itemIndex) => itemIndex !== index))}>×</button>
							</div>
						))}
						<button className="tool-button secondary" type="button" disabled={deliveryNote.items.length >= DELIVERY_NOTE_MAX_ITEMS} onClick={() => updateField('items', [...deliveryNote.items, { description: '', quantity: 1, unit: 'item' }])}>Add delivery item</button>
						{deliveryNote.items.length >= DELIVERY_NOTE_MAX_ITEMS && <small>Maximum of {DELIVERY_NOTE_MAX_ITEMS} items.</small>}
					</div>
					<div className="calc-field">
						<label htmlFor="delivery-notes">Delivery notes / instructions</label>
						<textarea id="delivery-notes" maxLength={500} rows={4} value={deliveryNote.notes} onChange={(event) => updateField('notes', event.target.value)} placeholder="Handling instructions or other delivery details" />
					</div>
				</div>

				<section className="invoice-generator-preview delivery-note-preview" aria-label="Live delivery note preview">
					<header className="invoice-generator-header">
						<div><p className="invoice-generator-kicker">SENDER</p><h2>{deliveryNote.senderName || 'Your Business'}</h2><p>{deliveryNote.senderDetails || 'Sender address and contact details'}</p></div>
						<div className="invoice-generator-title"><h2>DELIVERY NOTE</h2><strong>{deliveryNote.noteNumber || 'Delivery note number'}</strong></div>
					</header>
					<div className="invoice-generator-parties">
						<div><p className="invoice-generator-kicker">RECIPIENT</p><strong>{deliveryNote.recipientName || 'Recipient name'}</strong><p>{deliveryNote.recipientDetails || 'Recipient address and contact details'}</p></div>
						<div><p><strong>Dispatch date</strong> {deliveryNote.dispatchDate || '—'}</p><p><strong>Reference</strong> {deliveryNote.reference || '—'}</p><p><strong>Carrier</strong> {deliveryNote.carrier || '—'}</p></div>
					</div>
					<div className="invoice-generator-parties">
						<div><p className="invoice-generator-kicker">DELIVER TO</p><p>{deliveryNote.deliveryAddress || 'Destination or receiving location'}</p></div>
					</div>
					<div className="invoice-generator-table-wrap">
						<table className="invoice-generator-table delivery-note-table">
							<thead><tr><th>Description</th><th>Quantity</th><th>Unit</th></tr></thead>
							<tbody>{deliveryNote.items.map((item, index) => <tr key={index}><td>{item.description || '—'}</td><td>{Number.isFinite(item.quantity) ? item.quantity : '—'}</td><td>{item.unit || '—'}</td></tr>)}</tbody>
						</table>
					</div>
					<div className="delivery-note-acknowledgment">
						<strong>Delivery acknowledgment</strong>
						<p>Received by: __________________________</p>
						<p>Signature: ____________________________</p>
						<p>Date received: ________________________</p>
					</div>
					{deliveryNote.notes && <div className="invoice-generator-notes"><p className="invoice-generator-kicker">DELIVERY NOTES</p><p>{deliveryNote.notes}</p></div>}
				</section>
			</div>
			<div className="tool-actions">
				<button className="tool-button" type="button" disabled={busy} onClick={downloadPdf}>{busy ? 'Creating PDF…' : 'Download delivery note PDF'}</button>
			</div>
			<p className="tool-message" role="status">{message}</p>
			<p className="invoice-generator-disclaimer">A delivery note records items dispatched and provides space for receipt acknowledgment. It does not confirm payment or replace carrier tracking.</p>
		</div>
	);
}
