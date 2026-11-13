import type { BackgroundModelName, LoadedModel } from './model-loader';

interface RuntimeMessage {
	type: 'ready' | 'error';
	message?: string;
}

export interface ModelRuntimeHandle {
	terminate(): void;
}

export function initializeModelRuntime(
	model: BackgroundModelName,
	loadedModel: LoadedModel,
): Promise<ModelRuntimeHandle> {
	return new Promise((resolve, reject) => {
		const worker = new Worker(new URL('./model-runtime.worker.ts', import.meta.url), { type: 'module' });
		let ready = false;
		const fail = (error: Error) => {
			worker.terminate();
			if (!ready) reject(error);
		};

		worker.onmessage = (event: MessageEvent<RuntimeMessage>) => {
			if (event.data.type === 'error') {
				fail(new Error(event.data.message || 'The ONNX model could not start.'));
				return;
			}
			if (event.data.type === 'ready') {
				ready = true;
				resolve({ terminate: () => worker.terminate() });
			}
		};
		worker.onerror = () => fail(new Error('The model runtime worker stopped unexpectedly.'));
		worker.postMessage(
			{
				type: 'init',
				model,
				manifest: loadedModel.manifest,
				bytes: loadedModel.bytes,
			},
			[loadedModel.bytes],
		);
	});
}
