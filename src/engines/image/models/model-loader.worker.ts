import { getImageLimits } from '../toolkit';
import type { BackgroundModelName, ModelManifest } from './model-loader';

interface WorkerRequest {
	type: 'load' | 'consent-response';
	model?: BackgroundModelName;
	accepted?: boolean;
}

interface WorkerScope {
	postMessage(message: unknown, transfer?: Transferable[]): void;
	onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null;
	location: Location;
}

const scope = self as unknown as WorkerScope;
const MAX_MODEL_BYTES = 512 * 1024 * 1024;
let consentResolver: ((accepted: boolean) => void) | undefined;

function emitProgress(completedBytes: number, totalBytes: number): void {
	scope.postMessage({
		type: 'progress',
		completedBytes,
		totalBytes,
		percent: totalBytes > 0 ? Math.min(100, completedBytes / totalBytes * 100) : 0,
	});
}

function consentForDownload(downloadBytes: number): Promise<boolean> {
	return new Promise((resolve) => {
		consentResolver = resolve;
		scope.postMessage({ type: 'consent-required', downloadBytes });
	});
}

async function digest(buffer: ArrayBuffer): Promise<string> {
	const result = await crypto.subtle.digest('SHA-256', buffer);
	return Array.from(new Uint8Array(result), (value) => value.toString(16).padStart(2, '0')).join('');
}

function modelUrls(model: BackgroundModelName): { manifest: URL; directory: URL } {
	const directory = new URL(`/models/${model}/`, scope.location.origin);
	return { manifest: new URL('manifest.json', directory), directory };
}

async function readManifest(model: BackgroundModelName): Promise<{ manifest: ModelManifest; directory: URL }> {
	const { manifest: manifestUrl, directory } = modelUrls(model);
	const response = await fetch(manifestUrl, { credentials: 'same-origin', cache: 'no-cache' });
	if (!response.ok) throw new Error(`The ${model} model manifest could not be loaded (HTTP ${response.status}).`);
	const manifest = await response.json() as ModelManifest;
	const limits = getImageLimits();
	if (
		manifest.name !== model
		|| !Number.isSafeInteger(manifest.totalBytes)
		|| manifest.totalBytes < 1
		|| manifest.totalBytes > MAX_MODEL_BYTES
		|| !manifest.inputSize
		|| !Number.isSafeInteger(manifest.inputSize.width)
		|| !Number.isSafeInteger(manifest.inputSize.height)
		|| manifest.inputSize.width * manifest.inputSize.height > limits.maxPixels
		|| !Array.isArray(manifest.parts)
		|| manifest.parts.length === 0
	) {
		throw new Error(`The ${model} model manifest is invalid or exceeds this device's limits.`);
	}
	const listedBytes = manifest.parts.reduce((sum, part) => sum + part.bytes, 0);
	if (
		listedBytes !== manifest.totalBytes
		|| manifest.parts.some((part) => (
			!part.file
			|| !Number.isSafeInteger(part.bytes)
			|| part.bytes < 1
			|| part.bytes >= 24 * 1024 * 1024
			|| !/^[a-f\d]{64}$/i.test(part.sha256)
		))
		|| !/^[a-f\d]{64}$/i.test(manifest.sha256)
		|| new Set(manifest.parts.map((part) => part.file)).size !== manifest.parts.length
	) {
		throw new Error(`The ${model} model manifest has invalid part sizes or checksums.`);
	}
	for (const part of manifest.parts) {
		const partUrl = new URL(part.file, directory);
		if (partUrl.origin !== scope.location.origin || !partUrl.pathname.startsWith(directory.pathname)) {
			throw new Error(`The ${model} manifest contains a model part outside this site.`);
		}
	}
	return { manifest, directory };
}

async function loadModelBytes(model: BackgroundModelName): Promise<{ manifest: ModelManifest; bytes: ArrayBuffer }> {
	if (!('caches' in globalThis) || !crypto?.subtle) {
		throw new Error('This browser needs Cache Storage and SHA-256 support to safely download models.');
	}
	const { manifest, directory } = await readManifest(model);
	const cache = await caches.open('starmore-models-v1');
	const parts: (ArrayBuffer | undefined)[] = new Array(manifest.parts.length);
	const urls = manifest.parts.map((part) => new URL(part.file, directory));
	let missingBytes = 0;
	let completedBytes = 0;

	for (let index = 0; index < manifest.parts.length; index += 1) {
		const part = manifest.parts[index];
		const cached = await cache.match(urls[index]);
		if (!cached) {
			missingBytes += part.bytes;
			continue;
		}
		const buffer = await cached.arrayBuffer();
		if (buffer.byteLength === part.bytes && await digest(buffer) === part.sha256) {
			parts[index] = buffer;
			completedBytes += buffer.byteLength;
			emitProgress(completedBytes, manifest.totalBytes);
		} else {
			await cache.delete(urls[index]);
			missingBytes += part.bytes;
		}
	}

	if (missingBytes > 10 * 1024 * 1024 && !await consentForDownload(missingBytes)) {
		throw new Error('Model download was cancelled. You can try again whenever you are ready.');
	}

	const newlyCached: URL[] = [];
	try {
		for (let index = 0; index < manifest.parts.length; index += 1) {
			if (parts[index]) continue;
			const part = manifest.parts[index];
			const response = await fetch(urls[index], { credentials: 'same-origin', cache: 'no-store' });
			if (!response.ok) throw new Error(`A model file could not be downloaded (HTTP ${response.status}).`);
			const reader = response.body?.getReader();
			if (!reader) throw new Error('The browser could not stream a model file for verification.');
			const chunks: Uint8Array[] = [];
			let received = 0;
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				if (!value) continue;
				received += value.byteLength;
				if (received > part.bytes) throw new Error('A model part was larger than its manifest entry.');
				chunks.push(value);
				emitProgress(completedBytes + received, manifest.totalBytes);
			}
			if (received !== part.bytes) throw new Error('A model part had an unexpected size.');
			const buffer = new Uint8Array(received);
			let offset = 0;
			for (const chunk of chunks) {
				buffer.set(chunk, offset);
				offset += chunk.byteLength;
			}
			const partBuffer = buffer.buffer;
			if (await digest(partBuffer) !== part.sha256) {
				throw new Error('Model integrity check failed: a downloaded part did not match its SHA-256.');
			}
			await cache.put(urls[index], new Response(partBuffer.slice(0)));
			newlyCached.push(urls[index]);
			parts[index] = partBuffer;
			completedBytes += received;
			emitProgress(completedBytes, manifest.totalBytes);
		}

		const assembled = new Uint8Array(manifest.totalBytes);
		let offset = 0;
		for (let index = 0; index < parts.length; index += 1) {
			const partBuffer = parts[index];
			if (!partBuffer) throw new Error('A model part was unavailable after download.');
			const expected = manifest.parts[index];
			if (partBuffer.byteLength !== expected.bytes || await digest(partBuffer) !== expected.sha256) {
				throw new Error('Model integrity check failed: cached model data did not match its SHA-256.');
			}
			assembled.set(new Uint8Array(partBuffer), offset);
			offset += partBuffer.byteLength;
		}
		if (offset !== manifest.totalBytes || await digest(assembled.buffer) !== manifest.sha256) {
			throw new Error('Model integrity check failed: the assembled model did not match its SHA-256.');
		}
		emitProgress(manifest.totalBytes, manifest.totalBytes);
		scope.postMessage({ type: 'loaded', manifest, bytes: assembled.buffer }, [assembled.buffer]);
	} catch (error) {
		if (error instanceof Error && error.message.includes('integrity check failed')) {
			await Promise.all(urls.map((url) => cache.delete(url)));
		} else {
			await Promise.all(newlyCached.map((url) => cache.delete(url)));
		}
		throw error;
	}
}

scope.onmessage = (event: MessageEvent<WorkerRequest>) => {
	if (event.data.type === 'consent-response') {
		consentResolver?.(event.data.accepted === true);
		consentResolver = undefined;
		return;
	}
	if (event.data.type !== 'load' || (event.data.model !== 'u2netp' && event.data.model !== 'isnet')) {
		scope.postMessage({ type: 'error', message: 'The model download request was invalid.' });
		return;
	}
	void loadModelBytes(event.data.model).catch((error: unknown) => {
		scope.postMessage({
			type: 'error',
			message: error instanceof Error ? error.message : 'The model could not be verified and loaded.',
		});
	});
};
