export type RasterFormat = 'png' | 'jpg';
export type RasterScale = 1 | 2 | 4;

export interface RasterExportOptions {
	width: number;
	height: number;
	format: RasterFormat;
	scale: RasterScale;
	background?: string;
	quality?: number;
}

export interface RasterExportResult {
	blob: Blob;
	width: number;
	height: number;
}

function loadSvgImage(svg: string): Promise<{ image: HTMLImageElement; url: string }> {
	return new Promise((resolve, reject) => {
		const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
		const url = URL.createObjectURL(blob);
		const image = new Image();
		image.onload = () => resolve({ image, url });
		image.onerror = () => {
			URL.revokeObjectURL(url);
			reject(new Error('The SVG preview could not be rendered as an image.'));
		};
		image.src = url;
	});
}

function canvasBlob(canvas: HTMLCanvasElement, format: RasterFormat, quality: number): Promise<Blob> {
	return new Promise((resolve, reject) => {
		canvas.toBlob(
			(blob) => {
				if (blob) resolve(blob);
				else reject(new Error(`The browser could not create the ${format.toUpperCase()} image.`));
			},
			format === 'png' ? 'image/png' : 'image/jpeg',
			format === 'jpg' ? quality : undefined,
		);
	});
}

export async function renderSvgToRaster(svg: string, options: RasterExportOptions): Promise<RasterExportResult> {
	if (!Number.isFinite(options.width) || options.width < 1 || !Number.isFinite(options.height) || options.height < 1) {
		throw new Error('The artboard has invalid dimensions.');
	}

	const width = Math.round(options.width * options.scale);
	const height = Math.round(options.height * options.scale);
	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	const context = canvas.getContext('2d');
	if (!context) throw new Error('Your browser could not create an image export surface.');

	const { image, url } = await loadSvgImage(svg);
	try {
		if (options.background && options.background !== 'transparent') {
			context.fillStyle = options.background;
			context.fillRect(0, 0, width, height);
		}
		context.drawImage(image, 0, 0, width, height);
		const quality = Number.isFinite(options.quality) ? Math.min(1, Math.max(0.1, options.quality ?? 0.92)) : 0.92;
		return { blob: await canvasBlob(canvas, options.format, quality), width, height };
	} finally {
		URL.revokeObjectURL(url);
		canvas.width = 0;
		canvas.height = 0;
	}
}

export function downloadBlob(blob: Blob, filename: string): void {
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = filename;
	link.click();
	window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
