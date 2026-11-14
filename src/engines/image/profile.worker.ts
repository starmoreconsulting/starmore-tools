import { checkImageDimensions } from './toolkit';
import type { PassportMask } from './passport-engine';
import type { ProfilePictureOptions } from './profile-engine';

interface WorkerRequest {
	id: string;
	file: File;
	options: ProfilePictureOptions;
	mask?: { width: number; height: number; data: ArrayBuffer };
}

interface WorkerScope {
	postMessage(message: unknown): void;
	onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null;
}

const scope = self as unknown as WorkerScope;

function drawBackground(context: OffscreenCanvasRenderingContext2D, options: ProfilePictureOptions, size: number): void {
	if (options.background.kind === 'solid') {
		context.fillStyle = options.background.color;
	} else {
		const gradient = context.createLinearGradient(0, 0, size, size);
		gradient.addColorStop(0, options.background.start);
		gradient.addColorStop(1, options.background.end);
		context.fillStyle = gradient;
	}
	context.fillRect(0, 0, size, size);
}

function makeClip(context: OffscreenCanvasRenderingContext2D, shape: ProfilePictureOptions['shape'], size: number): void {
	context.beginPath();
	if (shape === 'circle') context.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
	else if (shape === 'rounded-square') {
		const radius = size * 0.2;
		context.roundRect(0, 0, size, size, radius);
	} else context.rect(0, 0, size, size);
	context.clip();
}

async function render(request: WorkerRequest): Promise<Blob> {
	let bitmap: ImageBitmap;
	try {
		bitmap = await createImageBitmap(request.file, { imageOrientation: 'from-image' });
	} catch {
		throw new Error('This image could not be decoded. If it is HEIC/HEIF or an unusual format, convert it to JPG or PNG first.');
	}
	try {
		checkImageDimensions(bitmap.width, bitmap.height);
		const { options } = request;
		if (!Number.isSafeInteger(options.size) || options.size < 1 || options.size > 1080) {
			throw new Error('Choose an output size of 400, 800, or 1080 pixels.');
		}
		const mask: PassportMask | undefined = request.mask ? { ...request.mask, data: new Uint8Array(request.mask.data) } : undefined;
		if (mask && (mask.width < 1 || mask.height < 1 || mask.width > 2048 || mask.height > 2048 || mask.width * mask.height !== mask.data.length)) {
			throw new Error('The cutout mask dimensions are invalid.');
		}
		const output = new OffscreenCanvas(options.size, options.size);
		const context = output.getContext('2d');
		if (!context) throw new Error('Your browser could not prepare the profile picture.');
		makeClip(context, options.shape, options.size);
		drawBackground(context, options, options.size);
		const subject = mask ? new OffscreenCanvas(options.size, options.size) : output;
		const subjectContext = subject.getContext('2d');
		if (!subjectContext) throw new Error('Your browser could not prepare the profile picture.');
		subjectContext.drawImage(
			bitmap,
			options.crop.x, options.crop.y, options.crop.width, options.crop.height,
			0, 0, options.size, options.size,
		);
		if (mask) {
			const alphaCanvas = new OffscreenCanvas(mask.width, mask.height);
			const alphaContext = alphaCanvas.getContext('2d');
			if (!alphaContext) throw new Error('Your browser could not prepare the cutout mask.');
			const rgba = new Uint8ClampedArray(mask.data.length * 4);
			for (let index = 0; index < mask.data.length; index += 1) {
				const offset = index * 4;
				rgba[offset] = rgba[offset + 1] = rgba[offset + 2] = 255;
				rgba[offset + 3] = mask.data[index];
			}
			alphaContext.putImageData(new ImageData(rgba, mask.width, mask.height), 0, 0);
			subjectContext.save();
			subjectContext.globalCompositeOperation = 'destination-in';
			subjectContext.drawImage(
				alphaCanvas,
				options.crop.x / bitmap.width * mask.width,
				options.crop.y / bitmap.height * mask.height,
				options.crop.width / bitmap.width * mask.width,
				options.crop.height / bitmap.height * mask.height,
				0, 0, options.size, options.size,
			);
			subjectContext.restore();
			context.drawImage(subject, 0, 0);
		}
		if (options.ring && options.ringWidth > 0) {
			context.save();
			context.strokeStyle = options.ringColor;
			context.lineWidth = Math.max(1, Math.min(options.size / 8, options.ringWidth));
			const inset = context.lineWidth / 2;
			context.beginPath();
			if (options.shape === 'circle') context.arc(options.size / 2, options.size / 2, (options.size - context.lineWidth) / 2, 0, Math.PI * 2);
			else if (options.shape === 'rounded-square') context.roundRect(inset, inset, options.size - context.lineWidth, options.size - context.lineWidth, Math.max(0, options.size * 0.2 - inset));
			else context.rect(inset, inset, options.size - context.lineWidth, options.size - context.lineWidth);
			context.stroke();
			context.restore();
		}
		return output.convertToBlob({ type: 'image/png' });
	} finally {
		bitmap.close();
	}
}

scope.onmessage = (event) => {
	const request = event.data;
	void render(request).then((blob) => {
		scope.postMessage({ id: request.id, blob });
	}).catch((error: unknown) => {
		scope.postMessage({ id: request.id, error: error instanceof Error ? error.message : 'Profile picture processing failed.' });
	});
};
