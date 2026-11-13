import { checkImageDimensions } from '../toolkit';
import type { BackgroundModelName, ModelManifest } from './model-loader';

interface WorkerRequest {
	type: 'init' | 'process';
	model?: BackgroundModelName;
	manifest?: ModelManifest;
	bytes?: ArrayBuffer;
	file?: Blob;
}

interface WorkerScope {
	postMessage(message: unknown, transfer?: Transferable[]): void;
	onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null;
	location: Location;
}

interface WorkerResult {
	width: number;
	height: number;
	maskWidth: number;
	maskHeight: number;
	mask: Uint8Array;
}

const scope = self as unknown as WorkerScope;
let runtimeSession: import('onnxruntime-web').InferenceSession | undefined;
let runtime: typeof import('onnxruntime-web') | undefined;
let activeModel: BackgroundModelName | undefined;
let activeManifest: ModelManifest | undefined;

async function initializeRuntime(model: BackgroundModelName, bytes: ArrayBuffer): Promise<void> {
	try {
		const runtimeUrl = new URL('/ort/ort.wasm.min.mjs', scope.location.origin).href;
		runtime = await import(/* @vite-ignore */ runtimeUrl) as typeof import('onnxruntime-web');
		runtime.env.wasm.numThreads = 1;
		runtime.env.wasm.wasmPaths = new URL('/ort/', scope.location.origin).href;
		runtimeSession = await runtime.InferenceSession.create(bytes, { executionProviders: ['wasm'] });
		if (!runtimeSession.inputNames[0] || !runtimeSession.outputNames[0]) {
			throw new Error('The model does not expose a usable input and matte output.');
		}
		activeModel = model;
		scope.postMessage({ type: 'ready' });
	} catch (error) {
		const message = model === 'isnet'
			? 'The high-quality model could not start in this browser, often because its fp16 weights are unsupported. Try Quick mode instead.'
			: `The Quick model could not start in this browser. ${error instanceof Error ? error.message : ''}`;
		scope.postMessage({ type: 'error', message });
	}
}

function makeInputPixels(pixels: Uint8ClampedArray, manifest: ModelManifest): Float32Array {
	const { width, height } = manifest.inputSize;
	const channelSize = width * height;
	const input = new Float32Array(channelSize * 3);
	if (manifest.name === 'u2netp') {
		let maximum = 0;
		for (let index = 0; index < pixels.length; index += 4) {
			maximum = Math.max(maximum, pixels[index], pixels[index + 1], pixels[index + 2]);
		}
		const scale = 1 / Math.max(1, maximum);
		const means = manifest.preprocessing.normalize?.mean ?? [0.485, 0.456, 0.406];
		const stds = manifest.preprocessing.normalize?.std ?? [0.229, 0.224, 0.225];
		for (let pixel = 0; pixel < channelSize; pixel += 1) {
			const offset = pixel * 4;
			for (let channel = 0; channel < 3; channel += 1) {
				input[channel * channelSize + pixel] = (pixels[offset + channel] * scale - means[channel]) / stds[channel];
			}
		}
		return input;
	}

	for (let pixel = 0; pixel < channelSize; pixel += 1) {
		const offset = pixel * 4;
		for (let channel = 0; channel < 3; channel += 1) {
			input[channel * channelSize + pixel] = pixels[offset + channel] / 255 - 0.5;
		}
	}
	return input;
}

function normalizeMatte(raw: ArrayLike<number>, shape: readonly number[]): { data: Uint8Array; width: number; height: number } {
	if (shape.length < 2) throw new Error('The model returned a matte with an invalid shape.');
	const width = shape[shape.length - 1];
	const height = shape[shape.length - 2];
	if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1 || width * height !== raw.length) {
		throw new Error('The model returned a matte with an unsupported shape.');
	}
	let minimum = Infinity;
	let maximum = -Infinity;
	for (let index = 0; index < raw.length; index += 1) {
		const value = Number(raw[index]);
		if (!Number.isFinite(value)) throw new Error('The model returned invalid matte values.');
		minimum = Math.min(minimum, value);
		maximum = Math.max(maximum, value);
	}
	const span = maximum - minimum;
	const normalized = new Uint8Array(raw.length);
	if (span > 1e-12) {
		for (let index = 0; index < raw.length; index += 1) {
			normalized[index] = Math.round((Number(raw[index]) - minimum) / span * 255);
		}
	}
	return { data: normalized, width, height };
}

function resizeMaskBilinear(
	mask: { data: Uint8Array; width: number; height: number },
	width: number,
	height: number,
): Uint8Array {
	const output = new Uint8Array(width * height);
	for (let y = 0; y < height; y += 1) {
		const sourceY = Math.max(0, Math.min(mask.height - 1, (y + 0.5) * mask.height / height - 0.5));
		const y0 = Math.floor(sourceY);
		const y1 = Math.min(mask.height - 1, y0 + 1);
		const fy = sourceY - y0;
		for (let x = 0; x < width; x += 1) {
			const sourceX = Math.max(0, Math.min(mask.width - 1, (x + 0.5) * mask.width / width - 0.5));
			const x0 = Math.floor(sourceX);
			const x1 = Math.min(mask.width - 1, x0 + 1);
			const fx = sourceX - x0;
			const top = mask.data[y0 * mask.width + x0] * (1 - fx) + mask.data[y0 * mask.width + x1] * fx;
			const bottom = mask.data[y1 * mask.width + x0] * (1 - fx) + mask.data[y1 * mask.width + x1] * fx;
			output[y * width + x] = Math.round(top * (1 - fy) + bottom * fy);
		}
	}
	return output;
}

async function removeBackground(file: Blob): Promise<WorkerResult> {
	if (!runtime || !runtimeSession || !activeManifest || !activeModel) {
		throw new Error('The model session is not ready. Retry the model download or choose Quick mode.');
	}
	let bitmap: ImageBitmap;
	try {
		bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
	} catch {
		try {
			bitmap = await createImageBitmap(file);
		} catch {
			throw new Error('This image could not be decoded. If it is HEIC/HEIF or an unusual format, convert it to JPG or PNG first.');
		}
	}

	try {
		checkImageDimensions(bitmap.width, bitmap.height);
		const { width: inputWidth, height: inputHeight } = activeManifest.inputSize;
		const inputCanvas = new OffscreenCanvas(inputWidth, inputHeight);
		const inputContext = inputCanvas.getContext('2d', { willReadFrequently: true });
		if (!inputContext) throw new Error('The browser could not prepare the model input.');
		inputContext.imageSmoothingEnabled = true;
		inputContext.imageSmoothingQuality = 'high';
		inputContext.drawImage(bitmap, 0, 0, inputWidth, inputHeight);
		const inputPixels = inputContext.getImageData(0, 0, inputWidth, inputHeight);
		const tensorData = makeInputPixels(inputPixels.data, activeManifest);
		const inputName = runtimeSession.inputNames[0];
		const outputName = runtimeSession.outputNames[0];
		const tensor = new runtime.Tensor('float32', tensorData, [1, 3, inputHeight, inputWidth]);
		const outputs = await runtimeSession.run({ [inputName]: tensor });
		const matteOutput = outputs[outputName];
		if (!matteOutput) throw new Error('The model did not return its first matte output.');
		const scale = Math.min(1, 2048 / Math.max(bitmap.width, bitmap.height));
		const maskWidth = Math.max(1, Math.round(bitmap.width * scale));
		const maskHeight = Math.max(1, Math.round(bitmap.height * scale));
		const mask = resizeMaskBilinear(
			normalizeMatte(matteOutput.data as ArrayLike<number>, matteOutput.dims),
			maskWidth,
			maskHeight,
		);
		return { width: bitmap.width, height: bitmap.height, maskWidth, maskHeight, mask };
	} finally {
		bitmap.close();
	}
}

scope.onmessage = (event: MessageEvent<WorkerRequest>) => {
	if (event.data.type === 'process') {
		if (!event.data.file) {
			scope.postMessage({ type: 'error', message: 'No image was supplied to the model worker.' });
			return;
		}
		void removeBackground(event.data.file)
			.then((result) => {
				scope.postMessage({ type: 'result', result }, [result.mask.buffer]);
			})
			.catch((error: unknown) => {
				scope.postMessage({
					type: 'error',
					message: error instanceof Error ? error.message : 'Background processing could not complete.',
				});
			});
		return;
	}
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
	activeManifest = event.data.manifest;
	void initializeRuntime(event.data.model, event.data.bytes);
};
