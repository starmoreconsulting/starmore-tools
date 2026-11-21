export interface InvoiceItem { description: string; quantity: number; rate: number; }
export function calculateInvoice(items: InvoiceItem[], taxRate: number) {
	if (!Number.isFinite(taxRate) || taxRate < 0) throw new Error('Tax rate must be non-negative.');
	const subtotal = items.reduce((sum, item) => {
		if (!Number.isFinite(item.quantity) || !Number.isFinite(item.rate) || item.quantity < 0 || item.rate < 0) throw new Error('Enter valid item quantities and rates.');
		return sum + item.quantity * item.rate;
	}, 0);
	const tax = subtotal * taxRate / 100;
	const total = subtotal + tax;
	if (![subtotal, tax, total].every(Number.isFinite)) throw new Error('These values are too large to calculate safely.');
	return { subtotal, tax, total };
}
