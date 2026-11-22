export interface ExcelPreviewRow {
	cells: string[];
}

export interface ExcelPreviewSheet {
	name: string;
	rowCount: number;
	columnCount: number;
	rows: ExcelPreviewRow[];
}

export function cellValueText(value: unknown): string {
	if (value === null || value === undefined) return '';
	if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
	if (value instanceof Date) return value.toLocaleDateString();
	if (typeof value === 'object') {
		const record = value as Record<string, unknown>;
		if ('text' in record && typeof record.text === 'string') return record.text;
		if ('richText' in record && Array.isArray(record.richText)) {
			return record.richText.map((part) => typeof part === 'object' && part && 'text' in part ? String((part as Record<string, unknown>).text ?? '') : '').join('');
		}
		if ('result' in record && record.result !== undefined) return cellValueText(record.result);
		if ('hyperlink' in record && typeof record.hyperlink === 'string') return record.hyperlink;
	}
	return '';
}

export function compactSheetName(name: string) {
	return name.replace(/[\\/:*?"<>|]/g, '-').slice(0, 80) || 'Sheet';
}
