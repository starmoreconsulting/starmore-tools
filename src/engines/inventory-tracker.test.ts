import { describe, expect, it } from 'vitest';
import {
	addInventoryItem,
	adjustInventoryQuantity,
	createInventoryCsv,
	decodeInventoryStorage,
	encodeInventoryStorage,
	summarizeInventory,
	type InventoryDraft,
} from './inventory-tracker';

const draft: InventoryDraft = { sku: 'A-1', name: 'Widget', quantity: 4, reorderLevel: 4, unitCost: 2.5 };

describe('inventory tracker', () => {
	it('validates and adds unique items with normalized text and money', () => {
		const items = addInventoryItem([], { ...draft, sku: ' A-1 ', name: ' Widget ' }, 'id-1');
		expect(items[0]).toMatchObject({ id: 'id-1', sku: 'A-1', name: 'Widget', unitCost: 2.5 });
		expect(() => addInventoryItem(items, draft, 'id-2')).toThrow(/already exists/i);
		expect(() => addInventoryItem([], { ...draft, quantity: 1.5 }, 'id-3')).toThrow(/whole number/i);
		expect(() => addInventoryItem([], { ...draft, sku: '  ' }, 'id-4')).toThrow(/SKU/i);
	});

	it('adjusts stock while preventing negative or fractional quantities', () => {
		const items = addInventoryItem([], draft, 'id-1');
		expect(adjustInventoryQuantity(items, 'id-1', -2)[0]?.quantity).toBe(2);
		expect(() => adjustInventoryQuantity(items, 'id-1', -5)).toThrow(/cannot be negative/i);
		expect(() => adjustInventoryQuantity(items, 'id-1', 0.5)).toThrow(/whole number/i);
	});

	it('round trips browser storage and rejects malformed saved records', () => {
		const items = addInventoryItem([], draft, 'id-1');
		expect(decodeInventoryStorage(encodeInventoryStorage(items))).toEqual(items);
		expect(decodeInventoryStorage(null)).toEqual([]);
		expect(() => decodeInventoryStorage('{bad')).toThrow(/could not be read/i);
		expect(() => decodeInventoryStorage('[{}]')).toThrow(/invalid item/i);
	});

	it('exports a quoted CSV and neutralizes spreadsheet formulas', () => {
		const items = addInventoryItem([], { ...draft, sku: '=SUM(A1:A2)', name: 'A "quoted" item' }, 'id-1');
		const csv = createInventoryCsv(items);
		expect(csv).toContain('"\'=SUM(A1:A2)"');
		expect(csv).toContain('"A ""quoted"" item"');
		expect(csv.split('\r\n')).toHaveLength(2);
	});

	it('summarizes units, reorder alerts and stock value', () => {
		const items = addInventoryItem([], draft, 'id-1');
		expect(summarizeInventory(items)).toEqual({ itemCount: 1, totalUnits: 4, lowStockCount: 1, stockValue: 10 });
	});
});
