import { getImageInputType, type ImageOutputType } from './toolkit';
import type { ColorKeyOptions, TrimOptions } from './logo-key';

export interface LogoKeyRequest {
	file: File;
	key?: ColorKeyOptions;
	opacity?: number;
	trim?: TrimOptions;
	format?: ImageOutputType;
}

interface WorkerReply {
	id: string;
	blob?: Blob;
	error?: string;
}

export function processLogoImage(request: LogoKeyRequest): Promise<Blob> {
	getImageInputType(request.file);
	return new Promise((resolve, reject) => {
		const worker = new Worker(new URL('./logo-key.worker.ts', import.meta.url), { type: 'module' });
		const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
		worker.onmessage = (event: MessageEvent<WorkerReply>) => {
			if (event.data.id !== id) return;
			worker.terminate();
			if (event.data.error) reject(new Error(event.data.error));
			else if (event.data.blob) resolve(event.data.blob);
			else reject(new Error('Logo processing returned no image.'));
		};
		worker.onerror = () => {
			worker.terminate();
			reject(new Error('Logo processing stopped unexpectedly. Try a smaller image.'));
		};
		worker.postMessage({ ...request, id });
	});
}
