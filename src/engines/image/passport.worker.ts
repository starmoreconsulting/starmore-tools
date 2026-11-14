import { checkImageDimensions } from './toolkit';
import type { PassportMask, PassportRenderOptions, PassportSheetOptions } from './passport-engine';

interface PassportRequest {
	id: string;
	type: 'photo' | 'sheet';
	file: File;
	mask?: { data: ArrayBuffer; width: number; height: number };
	options: PassportRenderOptions | PassportSheetOptions;
	format: 'image/png' | 'image/jpeg' | 'image/webp';
}

interface WorkerScope {
	postMessage(message: unknown): void;
	onmessage: ((event: MessageEvent<PassportRequest>) => void) | null;
}

const scope = self as unknown as WorkerScope;

async function decode(file: File): Promise<ImageBitmap> {
	try {
		return await createImageBitmap(file, { imageOrientation: 'from-image' });
	} catch {
		throw new Error('This image could not be decoded. If it is HEIC/HEIF or an unusual format, convert it to JPG or PNG first.');
	}
}

function renderPhoto(
	bitmap: ImageBitmap,
	mask: PassportMask | undefined,
	options: PassportRenderOptions,
	width: number,
	height: number,
	background: string | null,
	format: PassportRequest['format'],
): OffscreenCanvas {
	const photo = new OffscreenCanvas(width, height);
	const context = photo.getContext('2d');
	if (!context) throw new Error('Your browser could not prepare the passport photo.');
	if (background || format === 'image/jpeg') {
		context.fillStyle = background ?? '#ffffff';
		context.fillRect(0, 0, width, height);
	}
	const subject = mask ? new OffscreenCanvas(width, height) : photo;
	const subjectContext = subject.getContext('2d');
	if (!subjectContext) throw new Error('Your browser could not prepare the passport photo.');
	subjectContext.save();
	subjectContext.filter = `brightness(${Math.max(0, Math.min(200, 100 + options.brightness))}%) contrast(${Math.max(0, Math.min(200, 100 + options.contrast))}%)`;
	subjectContext.drawImage(
		bitmap,
		options.crop.x, options.crop.y, options.crop.width, options.crop.height,
		0, 0, width, height,
	);
	subjectContext.restore();
	if (!mask) return photo;
	const maskCanvas = new OffscreenCanvas(mask.width, mask.height);
	const maskContext = maskCanvas.getContext('2d');
	if (!maskContext) throw new Error('Your browser could not prepare the background mask.');
	const alpha = new Uint8ClampedArray(mask.data.length * 4);
	for (let index = 0; index < mask.data.length; index += 1) {
		const offset = index * 4;
		alpha[offset] = alpha[offset + 1] = alpha[offset + 2] = 255;
		alpha[offset + 3] = mask.data[index];
	}
	maskContext.putImageData(new ImageData(alpha, mask.width, mask.height), 0, 0);
	subjectContext.save();
	subjectContext.globalCompositeOperation = 'destination-in';
	subjectContext.drawImage(
		maskCanvas,
		options.crop.x / bitmap.width * mask.width,
		options.crop.y / bitmap.height * mask.height,
		options.crop.width / bitmap.width * mask.width,
		options.crop.height / bitmap.height * mask.height,
		0, 0, width, height,
	);
	subjectContext.restore();
	context.drawImage(subject, 0, 0);
	return photo;
}

function crc32(bytes: Uint8Array): number {
	let crc = 0xffffffff;
	for (const byte of bytes) {
		crc ^= byte;
		for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
	}
	return (crc ^ 0xffffffff) >>> 0;
}

function writeUint32(bytes: Uint8Array, offset: number, value: number): void {
	new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).setUint32(offset, value);
}

async function add300Dpi(blob: Blob, type: PassportRequest['format']): Promise<Blob> {
	const bytes = new Uint8Array(await blob.arrayBuffer());
	if (type === 'image/png' && bytes.length >= 33) {
		const pixelsPerMeter = Math.round(300 / 0.0254);
		const chunk = new Uint8Array(21);
		writeUint32(chunk, 0, 9);
		chunk.set([0x70, 0x48, 0x59, 0x73], 4);
		writeUint32(chunk, 8, pixelsPerMeter);
		writeUint32(chunk, 12, pixelsPerMeter);
		chunk[16] = 1;
		writeUint32(chunk, 17, crc32(chunk.subarray(4, 17)));
		const result = new Uint8Array(bytes.length + chunk.length);
		result.set(bytes.subarray(0, 33), 0);
		result.set(chunk, 33);
		result.set(bytes.subarray(33), 33 + chunk.length);
		return new Blob([result], { type });
	}
	if (type === 'image/jpeg' && bytes.length >= 20 && bytes[0] === 0xff && bytes[1] === 0xd8) {
		if (bytes[2] === 0xff && bytes[3] === 0xe0 && String.fromCharCode(...bytes.subarray(6, 11)) === 'JFIF\0') {
			bytes[13] = 1;
			new DataView(bytes.buffer).setUint16(14, 300);
			new DataView(bytes.buffer).setUint16(16, 300);
			return new Blob([bytes], { type });
		}
		const segment = new Uint8Array([0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 1, 1, 0x2c, 1, 0x2c, 0, 0]);
		const result = new Uint8Array(bytes.length + segment.length);
		result.set(bytes.subarray(0, 2));
		result.set(segment, 2);
		result.set(bytes.subarray(2), 2 + segment.length);
		return new Blob([result], { type });
	}
	return blob;
}

async function render(request: PassportRequest): Promise<Blob> {
	const bitmap = await decode(request.file);
	try {
		checkImageDimensions(bitmap.width, bitmap.height);
		const mask = request.mask ? { ...request.mask, data: new Uint8Array(request.mask.data) } : undefined;
		if (mask && (mask.width < 1 || mask.height < 1 || mask.width * mask.height !== mask.data.length || mask.width > 2048 || mask.height > 2048)) {
			throw new Error('The background mask dimensions are invalid.');
		}
		const options = request.options;
		if (request.type === 'photo') {
			checkImageDimensions(options.width, options.height);
			const output = new OffscreenCanvas(options.width, options.height);
			const context = output.getContext('2d');
			if (!context) throw new Error('Your browser could not prepare the passport photo.');
			const photo = renderPhoto(bitmap, mask, options, options.width, options.height, options.background, request.format);
			context.drawImage(photo, 0, 0);
			return add300Dpi(await output.convertToBlob({ type: request.format, quality: 0.94 }), request.format);
		}
		const sheet = options as PassportSheetOptions;
		checkImageDimensions(sheet.sheetWidth, sheet.sheetHeight);
		const output = new OffscreenCanvas(sheet.sheetWidth, sheet.sheetHeight);
		const context = output.getContext('2d');
		if (!context) throw new Error('Your browser could not prepare the print sheet.');
		context.fillStyle = '#fff';
		context.fillRect(0, 0, sheet.sheetWidth, sheet.sheetHeight);
		for (const placement of sheet.placements) {
			const photo = renderPhoto(bitmap, mask, sheet, placement.width, placement.height, sheet.background, 'image/png');
			context.drawImage(photo, placement.x, placement.y);
			context.save();
			context.strokeStyle = '#777';
			context.lineWidth = Math.max(1, sheet.sheetWidth / 1600);
			context.strokeRect(placement.x, placement.y, placement.width, placement.height);
			context.restore();
		}
		return add300Dpi(await output.convertToBlob({ type: 'image/png' }), 'image/png');
	} finally {
		bitmap.close();
	}
}

scope.onmessage = (event) => {
	const request = event.data;
	void render(request).then((blob) => {
		scope.postMessage({ id: request.id, blob });
	}).catch((error: unknown) => {
		scope.postMessage({ id: request.id, error: error instanceof Error ? error.message : 'Passport photo processing failed.' });
	});
};
