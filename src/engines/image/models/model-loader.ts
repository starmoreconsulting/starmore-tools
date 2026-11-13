export type BackgroundModelName = 'u2netp' | 'isnet';

export interface ModelPart {
	file: string;
	bytes: number;
	sha256: string;
}

export interface ModelManifest {
	name: string;
	totalBytes: number;
	sha256: string;
	inputSize: { width: number; height: number };
	preprocessing: {
		scale: string;
		normalize?: { mean: number[]; std: number[] };
	};
	parts: ModelPart[];
}

export interface ModelDownloadProgress {
	completedBytes: number;
	totalBytes: number;
	percent: number;
}

export interface LoadedModel {
	manifest: ModelManifest;
	bytes: ArrayBuffer;
}

export interface ModelLoadOptions {
	onProgress?: (progress: ModelDownloadProgress) => void;
	requestConsent?: (downloadBytes: number) => Promise<boolean>;
}

interface WorkerMessage {
	type: 'progress' | 'consent-required' | 'loaded' | 'error';
	completedBytes?: number;
	totalBytes?: number;
	percent?: number;
	downloadBytes?: number;
	manifest?: ModelManifest;
	bytes?: ArrayBuffer;
	message?: string;
}

export const MODEL_CACHE_NAME = 'starmore-models-v1';
export const MODEL_DOWNLOAD_CONSENT_TEXT =
	'Downloaded once and saved on this device. On mobile data this may use a lot of data.';

export function removeDownloadedModels(): Promise<boolean> {
	if (!('caches' in globalThis)) {
		return Promise.reject(new Error('This browser does not support saved model downloads.'));
	}
	return caches.delete(MODEL_CACHE_NAME);
}

export function loadBackgroundModel(
	model: BackgroundModelName,
	options: ModelLoadOptions = {},
): Promise<LoadedModel> {
	return new Promise((resolve, reject) => {
		const worker = new Worker(new URL('./model-loader.worker.ts', import.meta.url), { type: 'module' });
		let settled = false;

		const finish = (error?: Error, result?: LoadedModel) => {
			if (settled) return;
			settled = true;
			worker.terminate();
			if (error) reject(error);
			else if (result) resolve(result);
			else reject(new Error('The model worker returned no result.'));
		};

		worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
			const message = event.data;
			if (message.type === 'progress') {
				if (typeof message.completedBytes === 'number' && typeof message.totalBytes === 'number') {
					options.onProgress?.({
						completedBytes: message.completedBytes,
						totalBytes: message.totalBytes,
						percent: message.percent ?? 0,
					});
				}
				return;
			}
			if (message.type === 'consent-required') {
				if (!options.requestConsent || typeof message.downloadBytes !== 'number') {
					finish(new Error('Consent is needed before downloading this model.'));
					return;
				}
				void options.requestConsent(message.downloadBytes).then(
					(accepted) => worker.postMessage({ type: 'consent-response', accepted }),
					(error: unknown) => finish(error instanceof Error ? error : new Error(String(error))),
				);
				return;
			}
			if (message.type === 'error') {
				finish(new Error(message.message || 'The background model could not complete its work.'));
				return;
			}
			if (message.type === 'loaded' && message.manifest && message.bytes) {
				finish(undefined, { manifest: message.manifest, bytes: message.bytes });
			}
		};

		worker.onerror = () => {
			finish(new Error('Background processing stopped unexpectedly. Try a smaller image or Quick mode.'));
		};
		worker.postMessage({ type: 'load', model });
	});
}
