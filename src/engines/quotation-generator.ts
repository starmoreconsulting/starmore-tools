import {
	calculateInvoiceGeneratorTotals,
	createQuotationPdf,
	type InvoiceGeneratorInput,
} from './invoice-generator';

export type QuotationGeneratorInput = InvoiceGeneratorInput;
export const calculateQuotationTotals = calculateInvoiceGeneratorTotals;

export async function createQuotationDocument(input: QuotationGeneratorInput): Promise<Uint8Array> {
	return createQuotationPdf(input);
}
