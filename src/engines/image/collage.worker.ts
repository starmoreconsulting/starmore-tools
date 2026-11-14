import { calculateCollageCells } from './collage-engine';
import { coverSourceCrop } from './composition-math';
import { checkImageDimensions } from './toolkit';
import type { CollageLayout } from '../../data/collage-layouts';
import type { CollageOptions } from './collage-engine';

interface WorkerRequest {
	id: string;
	files: File[];
	layout: CollageLayout;
	options: CollageOptions;
	format: 'image/png' | 'image/jpeg';
}

interface WorkerScope {
	postMessage(message: unknown): void;
	onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null;
}

const scope = self as unknown as WorkerScope;

async function render(request: WorkerRequest): Promise<Blob> {
	const bitmaps: ImageBitmap[] = [];
	try {
		for (const file of request.files) {
			try {
				bitmaps.push(await createImageBitmap(file, { imageOrientation: 'from-image' }));
			} catch {
				throw new Error('One of these photos could not be decoded. Convert unusual formats to JPG or PNG first.');
			}
		}
		const { options, layout } = request;
		checkImageDimensions(options.width, options.height);
		if (options.width > 4096 || options.height > 4096 || options.spacing < 0 || options.padding < 0
			|| !Number.isFinite(options.radius) || options.radius < 0
			|| options.zoom.length !== bitmaps.length || options.center.length !== bitmaps.length) {
			throw new Error('The collage settings are outside the supported range.');
		}
		const output = new OffscreenCanvas(options.width, options.height);
		const context = output.getContext('2d');
		if (!context) throw new Error('Your browser could not prepare the collage.');
		if (options.background.kind === 'solid') context.fillStyle = options.background.color;
		else {
			const gradient = context.createLinearGradient(0, 0, options.width, options.height);
			gradient.addColorStop(0, options.background.start);
			gradient.addColorStop(1, options.background.end);
			context.fillStyle = gradient;
		}
		context.fillRect(0, 0, options.width, options.height);
		const cells = calculateCollageCells(options.width, options.height, layout, options.spacing, options.padding);
		cells.forEach((cell, cellIndex) => {
			const sourceIndex = options.assignments[cellIndex];
			const bitmap = bitmaps[sourceIndex];
			const crop = coverSourceCrop(bitmap.width, bitmap.height, cell.width / cell.height, options.zoom[sourceIndex], options.center[sourceIndex]);
			context.save();
			context.beginPath();
			context.roundRect(cell.x, cell.y, cell.width, cell.height, Math.min(options.radius, cell.width / 2, cell.height / 2));
			context.clip();
			context.drawImage(bitmap, crop.x, crop.y, crop.width, crop.height, cell.x, cell.y, cell.width, cell.height);
			context.restore();
		});
		return output.convertToBlob({ type: request.format, quality: 0.94 });
	} finally {
		for (const bitmap of bitmaps) bitmap.close();
	}
}

scope.onmessage = (event) => {
	const request = event.data;
	void render(request).then((blob) => {
		scope.postMessage({ id: request.id, blob });
	}).catch((error: unknown) => {
		scope.postMessage({ id: request.id, error: error instanceof Error ? error.message : 'Collage processing failed.' });
	});
};
