export const fileSizeUnits = [
	{ id: 'B', label: 'Bytes (B)', bytes: 1 },
	{ id: 'KB', label: 'Kilobytes (KB, decimal)', bytes: 1_000 },
	{ id: 'MB', label: 'Megabytes (MB, decimal)', bytes: 1_000_000 },
	{ id: 'GB', label: 'Gigabytes (GB, decimal)', bytes: 1_000_000_000 },
	{ id: 'TB', label: 'Terabytes (TB, decimal)', bytes: 1_000_000_000_000 },
	{ id: 'KiB', label: 'Kibibytes (KiB, binary)', bytes: 1_024 },
	{ id: 'MiB', label: 'Mebibytes (MiB, binary)', bytes: 1_048_576 },
	{ id: 'GiB', label: 'Gibibytes (GiB, binary)', bytes: 1_073_741_824 },
	{ id: 'TiB', label: 'Tebibytes (TiB, binary)', bytes: 1_099_511_627_776 },
] as const;

export type FileSizeUnit = (typeof fileSizeUnits)[number]['id'];

export interface FileSizeConversion {
	value: number;
	bytes: number;
}

export function convertFileSize(amount: number, from: FileSizeUnit, to: FileSizeUnit): FileSizeConversion {
	if (!Number.isFinite(amount) || amount < 0) {
		throw new Error('Enter a finite, non-negative file size.');
	}
	const sourceUnit = fileSizeUnits.find((unit) => unit.id === from);
	const targetUnit = fileSizeUnits.find((unit) => unit.id === to);
	if (!sourceUnit || !targetUnit) {
		throw new Error('Choose a supported file size unit.');
	}
	const bytes = amount * sourceUnit.bytes;
	const value = bytes / targetUnit.bytes;
	if (!Number.isFinite(bytes) || !Number.isFinite(value)) {
		throw new Error('This value is too large to convert safely.');
	}
	return { value, bytes };
}
