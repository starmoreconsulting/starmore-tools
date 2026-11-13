import type { BackgroundModelName, ModelManifest } from './model-loader';

interface WorkerRequest {
	type: 'init';
	model?: BackgroundModelName;
	manifest?: ModelManifest;
	bytes?: ArrayBuffer;
}

interface WorkerScope {
	postMessage(message: unknown, transfer?: Transferable[]): void;
	onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null;
	location: Location;
}

const scope = self as unknown as WorkerScope;
let runtimeSession: import('onnxruntime-web').InferenceSession | undefined;

async function initializeRuntime(model: BackgroundModelName, bytes: ArrayBuffer): Promise<void> {
	try {
		const runtimeUrl = new URL('/ort/ort.wasm.min.mjs', scope.location.origin).href;
		const ort = await import(/* @vite-ignore */ runtimeUrl) as typeof import('onnxruntime-web');
		ort.env.wasm.numThreads = 1;
		ort.env.wasm.wasmPaths = new URL('/ort/', scope.location.origin).href;
		runtimeSession = await ort.InferenceSession.create(bytes, { executionProviders: ['wasm'] });
		if (!runtimeSession.inputNames[0] || !runtimeSession.outputNames[0]) {
			throw new Error('The model does not expose a usable input and matte output.');
		}
		scope.postMessage({ type: 'ready' });
	} catch (error) {
		const message = model === 'isnet'
			? 'The high-quality model could not start in this browser, often because its fp16 weights are unsupported. Try Quick mode instead.'
			: `The Quick model could not start in this browser. ${error instanceof Error ? error.message : ''}`;
		scope.postMessage({ type: 'error', message });
	}
}

scope.onmessage = (event: MessageEvent<WorkerRequest>) => {
	if (
		event.data.type !== 'init'
		|| !event.data.model
		|| !event.data.bytes
		|| !event.data.manifest
		|| event.data.manifest.name !== event.data.model
	) {
		scope.postMessage({ type: 'error', message: 'The model runtime request was invalid.' });
		return;
	}
	void initializeRuntime(event.data.model, event.data.bytes);
};
