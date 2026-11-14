import { getImageInputType, type ImageOutputType } from './toolkit';

export interface PassportRenderOptions {
	crop: { x: number; y: number; width: number; height: number };
	width: number;
	height: number;
	background: string | null;
	brightness: number;
	contrast: number;
}

export interface PassportMask {
	data: Uint8Array;
	width: number;
	height: number;
}

export interface PassportSheetOptions extends PassportRenderOptions {
	sheetWidth: number;
	sheetHeight: number;
	placements: { x: number; y: number; width: number; height: number }[];
}

interface WorkerReply {
	id: string;
	blob?: Blob;
	error?: string;
}

function runPassportWorker<T extends Blob>(
	request: { type: 'photo' | 'sheet'; file: File; mask?: PassportMask; options: PassportRenderOptions | PassportSheetOptions; format: ImageOutputType },
): Promise<T> {
	getImageInputType(request.file);
	return new Promise((resolve, reject) => {
		const worker = new Worker(new URL('./passport.worker.ts', import.meta.url), { type: 'module' });
		const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
		worker.onmessage = (event: MessageEvent<WorkerReply>) => {
			if (event.data.id !== id) return;
			worker.terminate();
			if (event.data.error) reject(new Error(event.data.error));
			else if (event.data.blob) resolve(event.data.blob as T);
			else reject(new Error('Passport photo processing returned no image.'));
		};
		worker.onerror = () => {
			worker.terminate();
			reject(new Error('Passport photo processing stopped unexpectedly. Try a smaller image.'));
		};
		const mask = request.mask ? { ...request.mask, data: request.mask.data.slice().buffer } : undefined;
		worker.postMessage({ ...request, mask, id }, mask ? [mask.data] : []);
	});
}

export function renderPassportPhoto(
	file: File,
	options: PassportRenderOptions,
	mask?: PassportMask,
	format: ImageOutputType = 'image/jpeg',
): Promise<Blob> {
	return runPassportWorker({ type: 'photo', file, options, mask, format });
}

export function renderPassportSheet(
	file: File,
	options: PassportSheetOptions,
	mask?: PassportMask,
): Promise<Blob> {
	return runPassportWorker({ type: 'sheet', file, options, mask, format: 'image/png' });
}
