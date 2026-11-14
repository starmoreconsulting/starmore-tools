import { checkImageDimensions } from './toolkit';
import type { ScreenshotOptions } from './screenshot-engine';

interface WorkerRequest {
	id: string;
	file: File;
	options: ScreenshotOptions;
}

interface WorkerScope {
	postMessage(message: unknown): void;
	onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null;
}

const scope = self as unknown as WorkerScope;

async function decode(file: File): Promise<ImageBitmap> {
	try {
		return await createImageBitmap(file, { imageOrientation: 'from-image' });
	} catch {
		throw new Error('An image could not be decoded. Convert unusual formats to JPG or PNG first.');
	}
}

function drawBackground(
	context: OffscreenCanvasRenderingContext2D,
	options: ScreenshotOptions,
	width: number,
	height: number,
	background: ImageBitmap | undefined,
): void {
	if (options.background.kind === 'solid') context.fillStyle = options.background.color;
	else if (options.background.kind === 'gradient') {
		const gradient = context.createLinearGradient(0, 0, width, height);
		gradient.addColorStop(0, options.background.start);
		gradient.addColorStop(1, options.background.end);
		context.fillStyle = gradient;
	} else if (background) {
		const scale = Math.max(width / background.width, height / background.height);
		const imageWidth = background.width * scale;
		const imageHeight = background.height * scale;
		context.drawImage(background, (width - imageWidth) / 2, (height - imageHeight) / 2, imageWidth, imageHeight);
		return;
	} else throw new Error('Choose a background image before exporting.');
	context.fillRect(0, 0, width, height);
}

function roundedRect(context: OffscreenCanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
	context.beginPath();
	context.roundRect(x, y, width, height, Math.max(0, Math.min(radius, width / 2, height / 2)));
}

async function render(request: WorkerRequest): Promise<Blob> {
	const { file, options } = request;
	let screenshot: ImageBitmap | undefined;
	let background: ImageBitmap | undefined;
	try {
		if (![1, 2, 4].includes(options.scale) || !Number.isFinite(options.padding) || options.padding < 0 || options.padding > 200
			|| !Number.isFinite(options.radius) || options.radius < 0 || options.radius > 100
			|| !Number.isFinite(options.shadowBlur) || options.shadowBlur < 0 || options.shadowBlur > 80
			|| !Number.isFinite(options.shadowOffset) || options.shadowOffset < 0 || options.shadowOffset > 80) {
			throw new Error('The screenshot settings are outside the supported range.');
		}
		screenshot = await decode(file);
		checkImageDimensions(screenshot.width, screenshot.height);
		if (options.backgroundImage) background = await decode(options.backgroundImage);
		const scale = options.scale;
		const padding = Math.round(options.padding * scale);
		const browserBar = options.frame === 'browser' ? Math.round(42 * scale) : 0;
		const phoneInset = options.frame === 'phone' ? Math.round(26 * scale) : 0;
		const topInset = options.frame === 'phone' ? Math.round(46 * scale) : browserBar;
		const bottomInset = options.frame === 'phone' ? Math.round(26 * scale) : 0;
		const frameWidth = screenshot.width * scale + phoneInset * 2;
		const frameHeight = screenshot.height * scale + topInset + bottomInset;
		const width = frameWidth + padding * 2;
		const height = frameHeight + padding * 2;
		checkImageDimensions(width, height);
		const canvas = new OffscreenCanvas(width, height);
		const context = canvas.getContext('2d');
		if (!context) throw new Error('Your browser could not prepare the screenshot.');
		drawBackground(context, options, width, height, background);
		const frameX = padding;
		const frameY = padding;
		if (options.shadow) {
			context.save();
			context.shadowColor = 'rgba(0, 0, 0, 0.32)';
			context.shadowBlur = options.shadowBlur * scale;
			context.shadowOffsetY = options.shadowOffset * scale;
			context.fillStyle = '#ffffff';
			roundedRect(context, frameX, frameY, frameWidth, frameHeight, (options.radius + (options.frame === 'phone' ? 22 : 0)) * scale);
			context.fill();
			context.restore();
		}
		if (options.frame === 'phone') {
			context.fillStyle = '#17191d';
			roundedRect(context, frameX, frameY, frameWidth, frameHeight, 34 * scale);
			context.fill();
			context.fillStyle = '#070809';
			context.beginPath();
			context.roundRect(frameX + frameWidth * 0.38, frameY + 10 * scale, frameWidth * 0.24, 7 * scale, 4 * scale);
			context.fill();
		} else if (options.frame === 'browser') {
			context.fillStyle = '#f3f4f6';
			roundedRect(context, frameX, frameY, frameWidth, frameHeight, options.radius * scale);
			context.fill();
			context.fillStyle = '#ef4444';
			context.beginPath();
			context.arc(frameX + 18 * scale, frameY + 21 * scale, 5 * scale, 0, Math.PI * 2);
			context.fill();
			context.fillStyle = '#f59e0b';
			context.beginPath();
			context.arc(frameX + 36 * scale, frameY + 21 * scale, 5 * scale, 0, Math.PI * 2);
			context.fill();
			context.fillStyle = '#22c55e';
			context.beginPath();
			context.arc(frameX + 54 * scale, frameY + 21 * scale, 5 * scale, 0, Math.PI * 2);
			context.fill();
		}
		const imageX = frameX + phoneInset;
		const imageY = frameY + topInset;
		const imageWidth = screenshot.width * scale;
		const imageHeight = screenshot.height * scale;
		context.save();
		roundedRect(context, imageX, imageY, imageWidth, imageHeight, options.frame === 'phone' ? 3 * scale : options.radius * scale);
		context.clip();
		context.drawImage(screenshot, imageX, imageY, imageWidth, imageHeight);
		context.restore();
		const blob = await canvas.convertToBlob({ type: options.format, quality: 0.94 });
		if (blob.type !== options.format) throw new Error(`${options.format === 'image/webp' ? 'WebP' : 'PNG'} export is not supported by this browser.`);
		return blob;
	} finally {
		screenshot?.close();
		background?.close();
	}
}

scope.onmessage = (event) => {
	const request = event.data;
	void render(request).then((blob) => {
		scope.postMessage({ id: request.id, blob });
	}).catch((error: unknown) => {
		scope.postMessage({ id: request.id, error: error instanceof Error ? error.message : 'Screenshot rendering failed.' });
	});
};
