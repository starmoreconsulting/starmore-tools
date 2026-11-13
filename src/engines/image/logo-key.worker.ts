import { checkImageDimensions } from './toolkit';
import { applyColorKey, trimTransparentPixels } from './logo-key';
import type { LogoKeyRequest, } from './logo-key-engine';

interface WorkerRequest extends Omit<LogoKeyRequest, 'file'> {
	id: string;
	file: File;
}

interface WorkerScope {
	postMessage(message: unknown): void;
	onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null;
}

const scope = self as unknown as WorkerScope;

async function render(request: WorkerRequest): Promise<Blob> {
	let bitmap: ImageBitmap;
	try {
		bitmap = await createImageBitmap(request.file, { imageOrientation: 'from-image' });
	} catch {
		throw new Error('This image could not be decoded. If it is HEIC/HEIF or an unusual format, convert it to JPG or PNG first.');
	}
	try {
		checkImageDimensions(bitmap.width, bitmap.height);
		const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
		const context = canvas.getContext('2d', { willReadFrequently: true });
		if (!context) throw new Error('Your browser could not prepare the logo image.');
		context.drawImage(bitmap, 0, 0);
		let pixels = context.getImageData(0, 0, bitmap.width, bitmap.height).data;
		let output = request.key ? applyColorKey(pixels, bitmap.width, bitmap.height, request.key) : pixels;
		if (request.opacity !== undefined) {
			const opacity = Math.max(0, Math.min(100, request.opacity)) / 100;
			output = output.slice();
			for (let index = 3; index < output.length; index += 4) output[index] = Math.round(output[index] * opacity);
		}
		let width = bitmap.width;
		let height = bitmap.height;
		if (request.trim?.enabled) {
			const trimmed = trimTransparentPixels(output, width, height, request.trim.padding);
			output = trimmed.data;
			width = trimmed.width;
			height = trimmed.height;
		}
		const result = new OffscreenCanvas(width, height);
		const resultContext = result.getContext('2d');
		if (!resultContext) throw new Error('Your browser could not prepare the transparent logo output.');
		resultContext.putImageData(new ImageData(output, width, height), 0, 0);
		return await result.convertToBlob({ type: request.format ?? 'image/png', quality: 0.92 });
	} finally {
		bitmap.close();
	}
}

scope.onmessage = (event) => {
	const request = event.data;
	void render(request).then((blob) => {
		scope.postMessage({ id: request.id, blob });
	}).catch((error: unknown) => {
		scope.postMessage({ id: request.id, error: error instanceof Error ? error.message : 'Logo processing failed.' });
	});
};
