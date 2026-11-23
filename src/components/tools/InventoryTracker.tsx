import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
	addInventoryItem,
	adjustInventoryQuantity,
	createInventoryCsv,
	decodeInventoryStorage,
	encodeInventoryStorage,
	INVENTORY_TRACKER_STORAGE_KEY,
	removeInventoryItem,
	summarizeInventory,
	type InventoryDraft,
	type InventoryItem,
} from '../../engines/inventory-tracker';
import { triggerDownload } from '../../engines/pdf';
import { formatValue } from '../../engines/calculator-format';

const emptyDraft = (): InventoryDraft => ({ sku: '', name: '', quantity: 0, reorderLevel: 0, unitCost: 0 });

export default function InventoryTracker() {
	const [items, setItems] = useState<InventoryItem[]>([]);
	const [draft, setDraft] = useState(emptyDraft);
	const [message, setMessage] = useState('Loading inventory saved in this browser.');
	const [isError, setIsError] = useState(false);
	const [storageReady, setStorageReady] = useState(false);

	useEffect(() => {
		try {
			setItems(decodeInventoryStorage(localStorage.getItem(INVENTORY_TRACKER_STORAGE_KEY)));
			setMessage('Inventory is stored only on this device in this browser.');
			setStorageReady(true);
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Could not restore saved inventory.');
			setIsError(true);
			setStorageReady(true);
		}
	}, []);

	useEffect(() => {
		if (!storageReady) return;
		try {
			localStorage.setItem(INVENTORY_TRACKER_STORAGE_KEY, encodeInventoryStorage(items));
		} catch {
			setMessage('Could not save inventory in this browser. Export a CSV backup before leaving this page.');
			setIsError(true);
		}
	}, [items, storageReady]);

	const totals = useMemo(() => summarizeInventory(items), [items]);
	const updateDraft = <K extends keyof InventoryDraft>(key: K, value: InventoryDraft[K]) => {
		setDraft((current) => ({ ...current, [key]: value }));
		setMessage('');
		setIsError(false);
	};

	const addItem = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		try {
			setItems(addInventoryItem(items, draft));
			setStorageReady(true);
			setDraft(emptyDraft());
			setMessage(storageReady ? 'Item added. Inventory is saved on this device.' : 'Item added for this session; browser storage is not available.');
			setIsError(!storageReady);
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Could not add this item.');
			setIsError(true);
		}
	};

	const adjust = (id: string, delta: number) => {
		try {
			setItems(adjustInventoryQuantity(items, id, delta));
			setStorageReady(true);
			setMessage('Stock quantity updated.');
			setIsError(false);
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Could not update stock.');
			setIsError(true);
		}
	};

	const exportCsv = () => {
		if (items.length === 0) return;
		const csv = createInventoryCsv(items);
		triggerDownload(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }), 'starmore-inventory.csv');
		setMessage(`Exported ${items.length} inventory item${items.length === 1 ? '' : 's'} as CSV.`);
		setIsError(false);
	};

	const reset = () => {
		setItems([]);
		setStorageReady(true);
		setMessage('Inventory cleared from this device.');
		setIsError(false);
	};

	return (
		<div>
			<form className="expense-entry-form" onSubmit={addItem}>
				<div className="expense-entry-fields">
					<div className="calc-field"><label htmlFor="inventory-sku">SKU / item code</label><input id="inventory-sku" required value={draft.sku} onChange={(event) => updateDraft('sku', event.target.value)} placeholder="SKU-001" /></div>
					<div className="calc-field"><label htmlFor="inventory-name">Item name</label><input id="inventory-name" required value={draft.name} onChange={(event) => updateDraft('name', event.target.value)} placeholder="Product name" /></div>
					<div className="calc-field"><label htmlFor="inventory-quantity">Quantity in stock</label><input id="inventory-quantity" type="number" min="0" step="1" required value={draft.quantity} onChange={(event) => updateDraft('quantity', Number(event.target.value))} /></div>
					<div className="calc-field"><label htmlFor="inventory-reorder">Reorder level</label><input id="inventory-reorder" type="number" min="0" step="1" required value={draft.reorderLevel} onChange={(event) => updateDraft('reorderLevel', Number(event.target.value))} /></div>
					<div className="calc-field"><label htmlFor="inventory-cost">Unit cost (optional)</label><input id="inventory-cost" type="number" min="0" step="0.01" value={draft.unitCost} onChange={(event) => updateDraft('unitCost', Number(event.target.value))} /></div>
				</div>
				<div className="expense-entry-actions"><button className="tool-button primary" type="submit">Add inventory item</button></div>
			</form>
			<div className="calc-result-grid three-columns" aria-live="polite">
				<div className="calc-result featured"><span className="calc-label">ITEMS</span><strong>{formatValue(totals.itemCount)}</strong></div>
				<div className="calc-result"><span className="calc-label">TOTAL UNITS</span><strong>{formatValue(totals.totalUnits)}</strong></div>
				<div className="calc-result"><span className="calc-label">AT / BELOW REORDER LEVEL</span><strong>{formatValue(totals.lowStockCount)}</strong></div>
			</div>
			<p className="tool-message">Estimated stock value: {formatValue(totals.stockValue)} in the currency you use for unit cost. Data stays in this browser on this device; export a CSV backup to keep a copy.</p>
			<div className="expense-entry-actions">
				<button className="tool-button" type="button" onClick={exportCsv} disabled={items.length === 0}>Export CSV</button>
				<button className="tool-button" type="button" onClick={reset} disabled={items.length === 0 && storageReady}>Reset inventory</button>
			</div>
			{items.length > 0 ? (
				<div className="tracker-table-wrap">
					<table className="tracker-table">
						<thead><tr><th>SKU</th><th>Item</th><th>In stock</th><th>Reorder at</th><th>Unit cost</th><th>Stock controls</th></tr></thead>
						<tbody>{items.map((item) => (
							<tr key={item.id}>
								<td>{item.sku}</td><td>{item.name}</td>
								<td>{item.quantity}{item.quantity <= item.reorderLevel && <span className="tracker-status">Low stock</span>}</td>
								<td>{item.reorderLevel}</td><td>{formatValue(item.unitCost)}</td>
								<td>
									<button className="tool-button" type="button" aria-label={`Decrease ${item.name} stock`} onClick={() => adjust(item.id, -1)} disabled={item.quantity === 0}>−</button>{' '}
									<button className="tool-button" type="button" aria-label={`Increase ${item.name} stock`} onClick={() => adjust(item.id, 1)}>+</button>{' '}
									<button className="tool-button" type="button" onClick={() => { setItems((current) => removeInventoryItem(current, item.id)); setMessage('Inventory item removed.'); }}>Remove</button>
								</td>
							</tr>
						))}</tbody>
					</table>
				</div>
			) : <p className="tool-message">No inventory items yet. Add an item above to begin tracking stock.</p>}
			<p className={`tool-message${isError ? ' error' : ''}`} role="status">{message}</p>
		</div>
	);
}
