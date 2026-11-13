import { getImageInputType } from '../toolkit';
import { loadBackgroundModel } from './model-loader';
import type { BackgroundModelName, LoadedModel, ModelLoadOptions } from './model-loader';

interface RuntimeMessage {
	type: 'ready' | 'result' | 'error';
	message?: string;
	result?: ModelWorkerResult;
}

export interface ModelWorkerResult {
	width: number;
	height: number;
	maskWidth: number;
	maskHeight: number;
	mask: Uint8Array;
}

export interface ModelRuntimeHandle {
	removeBackground(file: Blob): Promise<ModelWorkerResult>;
	terminate(): void;
}

export function initializeModelRuntime(
	model: BackgroundModelName,
	loadedModel: LoadedModel,
	signal?: AbortSignal,
): Promise<ModelRuntimeHandle> {
	return new Promise((resolve, reject) => {
		const worker = new Worker(new URL('./model-runtime.worker.ts', import.meta.url), { type: 'module' });
		let settled = false;
		let processing = false;
		let processResolve: ((result: ModelWorkerResult) => void) | undefined;
		let processReject: ((error: Error) => void) | undefined;
		const abort = () => {
			const error = new Error('Background processing was cancelled.');
			error.name = 'AbortError';
			fail(error);
		};
		const removeAbortListener = () => signal?.removeEventListener('abort', abort);
		const fail = (error: Error) => {
			if (processing) {
				processing = false;
				processReject?.(error);
				processReject = undefined;
				processResolve = undefined;
			}
			const wasReady = settled;
			settled = true;
			removeAbortListener();
			worker.terminate();
			if (!wasReady) reject(error);
		};

		worker.onmessage = (event: MessageEvent<RuntimeMessage>) => {
			if (event.data.type === 'error') {
				const error = new Error(event.data.message || 'The ONNX model could not start.');
				if (settled) {
					if (processing) {
						processing = false;
						processReject?.(error);
						processReject = undefined;
						processResolve = undefined;
					}
				} else {
					fail(error);
				}
				return;
			}
			if (event.data.type === 'ready') {
				settled = true;
				resolve({
					removeBackground: (file) => {
						if (signal?.aborted) {
							const error = new Error('Background processing was cancelled.');
							error.name = 'AbortError';
							return Promise.reject(error);
						}
						if (processing) return Promise.reject(new Error('This model is already processing an image.'));
						processing = true;
						return new Promise((resolveResult, rejectResult) => {
							processResolve = resolveResult;
							processReject = rejectResult;
							worker.postMessage({ type: 'process', file });
						});
					},
					terminate: () => {
						if (processing) {
							processReject?.(new Error('Background processing was stopped.'));
						}
						removeAbortListener();
						worker.terminate();
					},
				});
				return;
			}
			if (event.data.type === 'result' && event.data.result) {
				processing = false;
				processResolve?.(event.data.result);
				processResolve = undefined;
				processReject = undefined;
			}
		};
		worker.onerror = () => fail(new Error('The model runtime worker stopped unexpectedly.'));
		if (signal?.aborted) {
			abort();
			return;
		}
		signal?.addEventListener('abort', abort, { once: true });
		worker.postMessage(
			{ type: 'init', model, manifest: loadedModel.manifest, bytes: loadedModel.bytes },
			[loadedModel.bytes],
		);
	});
}

export async function runBackgroundModel(
	file: File,
	model: BackgroundModelName,
	options: ModelLoadOptions = {},
): Promise<ModelWorkerResult> {
	getImageInputType(file);
	const loadedModel = await loadBackgroundModel(model, options);
	const runtime = await initializeModelRuntime(model, loadedModel, options.signal);
	try {
		return await runtime.removeBackground(file);
	} finally {
		runtime.terminate();
	}
}
