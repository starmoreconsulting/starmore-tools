import { assessFileExtension } from './file-extension-checker';

export const METADATA_VIEWER_MAX_IMAGE_BYTES = 50_000_000;

export interface MetadataInputFile {
	name: string;
	type: string;
	size: number;
	lastModified: number;
}

export interface FileMetadata {
	name: string;
	extension: string;
	fileCategory: string;
	declaredMimeType: string;
	sizeBytes: number;
	sizeKilobytes: number;
	sizeKibibytes: number;
	lastModified: number | null;
	lastModifiedIso: string | null;
	imageLike: boolean;
}

export function getFileMetadata(file: MetadataInputFile): FileMetadata {
	const assessment = assessFileExtension(file.name);
	const modifiedDate = Number.isFinite(file.lastModified) && file.lastModified > 0
		? new Date(file.lastModified)
		: null;
	const validDate = modifiedDate && !Number.isNaN(modifiedDate.getTime()) ? modifiedDate : null;
	const category = file.type.startsWith('image/')
		? 'Image'
		: assessment.info?.category ?? 'Unknown';

	return {
		name: file.name,
		extension: assessment.extension
			? (assessment.extension.startsWith('.') ? assessment.extension : `.${assessment.extension}`)
			: 'No extension',
		fileCategory: category,
		declaredMimeType: file.type || 'Not provided by browser',
		sizeBytes: file.size,
		sizeKilobytes: file.size / 1000,
		sizeKibibytes: file.size / 1024,
		lastModified: validDate?.getTime() ?? null,
		lastModifiedIso: validDate?.toISOString() ?? null,
		imageLike: category === 'Image',
	};
}

export function formatFileSize(bytes: number, unit: 'bytes' | 'kb' | 'kib'): string {
	if (!Number.isFinite(bytes) || bytes < 0) throw new Error('File size must be a non-negative finite number.');
	if (unit === 'bytes') return `${bytes.toLocaleString()} bytes`;
	if (unit === 'kb') return `${(bytes / 1000).toLocaleString(undefined, { maximumFractionDigits: 2 })} KB (decimal)`;
	return `${(bytes / 1024).toLocaleString(undefined, { maximumFractionDigits: 2 })} KiB (binary)`;
}

export function formatModifiedDate(timestamp: number | null): string {
	if (timestamp === null) return 'Unavailable';
	const date = new Date(timestamp);
	if (Number.isNaN(date.getTime())) return 'Unavailable';
	return new Intl.DateTimeFormat(undefined, {
		dateStyle: 'medium',
		timeStyle: 'short',
	}).format(date);
}
