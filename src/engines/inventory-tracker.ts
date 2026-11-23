export const INVENTORY_TRACKER_STORAGE_KEY = 'starmore-inventory-tracker-v1';

export interface InventoryDraft {
	sku: string;
	name: string;
	quantity: number;
	reorderLevel: number;
	unitCost: number;
}

export interface InventoryItem extends InventoryDraft {
	id: string;
}

export function validateInventoryDraft(draft: InventoryDraft): InventoryDraft {
	const sku = draft.sku.trim();
	const name = draft.name.trim();
	if (!sku) throw new Error('Enter a SKU or item code.');
	if (!name) throw new Error('Enter an item name.');
	if (!Number.isSafeInteger(draft.quantity) || draft.quantity < 0) throw new Error('Quantity must be a non-negative whole number.');
	if (!Number.isSafeInteger(draft.reorderLevel) || draft.reorderLevel < 0) throw new Error('Reorder level must be a non-negative whole number.');
	if (!Number.isFinite(draft.unitCost) || draft.unitCost < 0 || !Number.isSafeInteger(Math.round(draft.unitCost * 100))) {
		throw new Error('Unit cost must be a valid non-negative amount.');
	}
	return { ...draft, sku, name, unitCost: Math.round(draft.unitCost * 100) / 100 };
}

export function addInventoryItem(items: InventoryItem[], draft: InventoryDraft, id = createInventoryId()): InventoryItem[] {
	const valid = validateInventoryDraft(draft);
	if (items.some((item) => item.sku.toLocaleLowerCase() === valid.sku.toLocaleLowerCase())) {
		throw new Error('An item with this SKU already exists.');
	}
	return [...items, { ...valid, id }];
}

function createInventoryId(): string {
	return globalThis.crypto?.randomUUID?.() ?? `inventory-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function adjustInventoryQuantity(items: InventoryItem[], id: string, delta: number): InventoryItem[] {
	if (!Number.isSafeInteger(delta)) throw new Error('Stock adjustment must be a whole number.');
	const item = items.find((entry) => entry.id === id);
	if (!item) throw new Error('Inventory item was not found.');
	const quantity = item.quantity + delta;
	if (!Number.isSafeInteger(quantity) || quantity < 0) throw new Error('Stock quantity cannot be negative.');
	return items.map((entry) => entry.id === id ? { ...entry, quantity } : entry);
}

export function removeInventoryItem(items: InventoryItem[], id: string): InventoryItem[] {
	return items.filter((item) => item.id !== id);
}

export function decodeInventoryStorage(raw: string | null): InventoryItem[] {
	if (raw === null || raw.trim() === '') return [];
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		throw new Error('Saved inventory data could not be read. Export or reset the damaged browser data.');
	}
	if (!Array.isArray(parsed)) throw new Error('Saved inventory data has an invalid format.');
	return parsed.map((item) => {
		if (!item || typeof item !== 'object') throw new Error('Saved inventory data has an invalid item.');
		const candidate = item as Partial<InventoryItem>;
		if (typeof candidate.id !== 'string' || typeof candidate.sku !== 'string' || typeof candidate.name !== 'string'
			|| typeof candidate.quantity !== 'number' || typeof candidate.reorderLevel !== 'number' || typeof candidate.unitCost !== 'number') {
			throw new Error('Saved inventory data has an invalid item.');
		}
		return { id: candidate.id, ...validateInventoryDraft(candidate as InventoryDraft) };
	});
}

export function encodeInventoryStorage(items: InventoryItem[]): string {
	return JSON.stringify(items.map((item) => ({ ...item, ...validateInventoryDraft(item) })));
}

function csvCell(value: string | number): string {
	let text = String(value);
	if (/^[\s]*[=+\-@]/.test(text)) text = `'${text}`;
	return `"${text.replaceAll('"', '""')}"`;
}

export function createInventoryCsv(items: InventoryItem[]): string {
	const header = ['SKU', 'Item', 'Quantity', 'Reorder level', 'Unit cost'];
	const rows = items.map((item) => [item.sku, item.name, item.quantity, item.reorderLevel, item.unitCost]);
	return [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
}

export function summarizeInventory(items: InventoryItem[]) {
	return {
		itemCount: items.length,
		totalUnits: items.reduce((sum, item) => sum + item.quantity, 0),
		lowStockCount: items.filter((item) => item.quantity <= item.reorderLevel).length,
		stockValue: items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0),
	};
}
