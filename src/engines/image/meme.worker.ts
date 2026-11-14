import { checkImageDimensions } from './toolkit';
import { fitTextToBox } from './meme-math';
import type { MemeOptions, MemeTextBox } from './meme-engine';

interface WorkerRequest {
	id: string;
	file: File | null;
	options: MemeOptions;
	fontUrl: string;
}

interface WorkerScope {
	postMessage(message: unknown): void;
	onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null;
}

const scope = self as unknown as WorkerScope;

function drawFittedText(
	context: OffscreenCanvasRenderingContext2D,
	text: string,
	x: number,
	y: number,
	width: number,
	height: number,
	preferredSize: number,
	strokeWidth: number,
): void {
	if (!text.trim()) return;
	const fitted = fitTextToBox(text, width, height, preferredSize, (value, size) => {
		context.font = `700 ${size}px StarmoreMemeOswald`;
		return context.measureText(value).width;
	});
	context.font = `700 ${fitted.fontSize}px StarmoreMemeOswald`;
	context.textAlign = 'center';
	context.textBaseline = 'middle';
	context.lineJoin = 'round';
	context.lineWidth = Math.max(0, strokeWidth * fitted.fontSize);
	const linePixels = fitted.fontSize * fitted.lineHeight;
	const firstY = y - (fitted.lines.length - 1) * linePixels / 2;
	fitted.lines.forEach((line, index) => {
		const lineY = firstY + index * linePixels;
		context.strokeText(line, x, lineY, width);
		context.fillText(line, x, lineY, width);
	});
}

function drawFreeText(context: OffscreenCanvasRenderingContext2D, box: MemeTextBox, options: MemeOptions): void {
	const text = options.uppercase ? box.text.toLocaleUpperCase() : box.text;
	drawFittedText(
		context,
		text,
		box.center.x * options.width,
		box.center.y * options.height,
		box.width * options.width,
		box.height * options.height,
		box.size * options.height,
		options.strokeWidth,
	);
}

async function render(request: WorkerRequest): Promise<Blob> {
	const { options } = request;
	checkImageDimensions(options.width, options.height);
	if (options.width > 4096 || options.height > 4096 || !Number.isFinite(options.strokeWidth) || options.strokeWidth < 0 || options.strokeWidth > 0.3) {
		throw new Error('The meme size or outline setting is outside the supported range.');
	}
	const font = new FontFace('StarmoreMemeOswald', `url(${request.fontUrl})`, { weight: '700' });
	await font.load();
	self.fonts.add(font);
	let bitmap: ImageBitmap | undefined;
	try {
		if (request.file) {
			try {
				bitmap = await createImageBitmap(request.file, { imageOrientation: 'from-image' });
			} catch {
				throw new Error('This image could not be decoded. Convert unusual formats to JPG or PNG first.');
			}
			checkImageDimensions(bitmap.width, bitmap.height);
		}
		const output = new OffscreenCanvas(options.width, options.height);
		const context = output.getContext('2d');
		if (!context) throw new Error('Your browser could not prepare the meme image.');
		context.fillStyle = options.background;
		context.fillRect(0, 0, options.width, options.height);
		if (bitmap) {
			const scale = Math.max(options.width / bitmap.width, options.height / bitmap.height);
			const width = bitmap.width * scale;
			const height = bitmap.height * scale;
			context.drawImage(bitmap, (options.width - width) / 2, (options.height - height) / 2, width, height);
		}
		context.fillStyle = '#ffffff';
		context.strokeStyle = '#000000';
		const topText = options.uppercase ? options.topText.toLocaleUpperCase() : options.topText;
		const bottomText = options.uppercase ? options.bottomText.toLocaleUpperCase() : options.bottomText;
		drawFittedText(context, topText, options.width / 2, options.height * 0.12, options.width * 0.9, options.height * 0.2, options.height * 0.15, options.strokeWidth);
		drawFittedText(context, bottomText, options.width / 2, options.height * 0.88, options.width * 0.9, options.height * 0.2, options.height * 0.15, options.strokeWidth);
		for (const box of options.freeTexts) drawFreeText(context, box, options);
		return output.convertToBlob({ type: options.format, quality: 0.94 });
	} finally {
		bitmap?.close();
		self.fonts.delete(font);
	}
}

scope.onmessage = (event) => {
	const request = event.data;
	void render(request).then((blob) => {
		scope.postMessage({ id: request.id, blob });
	}).catch((error: unknown) => {
		scope.postMessage({ id: request.id, error: error instanceof Error ? error.message : 'Meme rendering failed.' });
	});
};
