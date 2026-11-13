import { getImageInputType, type ImageOutputType } from './toolkit';

export type BrushMode = 'erase' | 'restore';

export interface BrushPoint {
	x: number;
	y: number;
}

export interface BrushStroke {
	mode: BrushMode;
	size: number;
	softness: number;
	hardness: number;
	points: BrushPoint[];
}

export interface MaskRefinement {
	hardness: number;
	feather: number;
	edgeShift: number;
}

export type BackgroundFill =
	| { kind: 'transparent' }
	| { kind: 'solid'; color: string }
	| { kind: 'gradient'; startColor: string; endColor: string }
	| { kind: 'blurred'; blur: number }
	| { kind: 'image'; bytes: ArrayBuffer; type: string; focusX: number; focusY: number };

export interface BackgroundExportOptions {
	format: ImageOutputType;
	quality: number;
	backgroundColor: string;
	fill?: BackgroundFill;
	outputWidth?: number;
	outputHeight?: number;
	shadow?: boolean;
}

interface MaskWorkerReply {
	id: string;
	mask?: ArrayBuffer;
	blob?: Blob;
	error?: string;
}

interface MaskWorkerRequest {
	id: string;
	type: 'rebuild' | 'refine' | 'export' | 'export-mask';
	file?: File;
	mask?: ArrayBuffer;
	maskWidth?: number;
	maskHeight?: number;
	strokes?: BrushStroke[];
	refinement?: MaskRefinement;
	options?: BackgroundExportOptions;
}

function runBackgroundWorker<T>(
	request: Omit<MaskWorkerRequest, 'id'>,
	transfer: Transferable[] = [],
): Promise<T> {
	return new Promise((resolve, reject) => {
		const worker = new Worker(new URL('./background.worker.ts', import.meta.url), { type: 'module' });
		const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
		worker.onmessage = (event: MessageEvent<MaskWorkerReply>) => {
			if (event.data.id !== id) return;
			worker.terminate();
			if (event.data.error) reject(new Error(event.data.error));
			else if (event.data.mask) resolve(new Uint8Array(event.data.mask) as T);
			else if (event.data.blob) resolve(event.data.blob as T);
			else reject(new Error('Background processing returned no result.'));
		};
		worker.onerror = () => {
			worker.terminate();
			reject(new Error('Background processing stopped unexpectedly. Try a smaller image.'));
		};
		worker.postMessage({ ...request, id }, transfer);
	});
}

export function rebuildBackgroundMask(
	baseMask: Uint8Array,
	width: number,
	height: number,
	strokes: BrushStroke[],
): Promise<Uint8Array> {
	const mask = baseMask.slice().buffer;
	return runBackgroundWorker<Uint8Array>({
		type: 'rebuild',
		mask,
		maskWidth: width,
		maskHeight: height,
		strokes,
	}, [mask]);
}

export function refineBackgroundMask(
	mask: Uint8Array,
	width: number,
	height: number,
	refinement: MaskRefinement,
	pixelScale: number,
): Promise<Uint8Array> {
	const data = mask.slice().buffer;
	return runBackgroundWorker<Uint8Array>({
		type: 'refine',
		mask: data,
		maskWidth: width,
		maskHeight: height,
		refinement: { ...refinement, feather: refinement.feather / pixelScale, edgeShift: refinement.edgeShift / pixelScale },
	}, [data]);
}

export function exportBackgroundImage(
	file: File,
	mask: Uint8Array,
	maskWidth: number,
	maskHeight: number,
	options: BackgroundExportOptions,
): Promise<Blob> {
	getImageInputType(file);
	const data = mask.slice().buffer;
	return runBackgroundWorker<Blob>({
		type: 'export',
		file,
		mask: data,
		maskWidth,
		maskHeight,
		options,
	}, [data]);
}

export function exportBackgroundMask(
	file: File,
	mask: Uint8Array,
	maskWidth: number,
	maskHeight: number,
): Promise<Blob> {
	getImageInputType(file);
	const data = mask.slice().buffer;
	return runBackgroundWorker<Blob>({
		type: 'export-mask',
		file,
		mask: data,
		maskWidth,
		maskHeight,
	}, [data]);
}
