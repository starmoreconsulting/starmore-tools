import { getImageInputType } from './toolkit';

export type ScreenshotFrame = 'none' | 'browser' | 'phone';
export type ScreenshotBackground =
	| { kind: 'solid'; color: string }
	| { kind: 'gradient'; start: string; end: string }
	| { kind: 'image' };

export interface ScreenshotOptions {
	scale: 1 | 2 | 4;
	padding: number;
	radius: number;
	shadow: boolean;
	shadowBlur: number;
	shadowOffset: number;
	frame: ScreenshotFrame;
	background: ScreenshotBackground;
	backgroundImage?: File;
	format: 'image/png' | 'image/webp';
}

export function renderScreenshotBeautification(file: File, options: ScreenshotOptions): Promise<Blob> {
	getImageInputType(file);
	if (options.backgroundImage) getImageInputType(options.backgroundImage);
	return new Promise((resolve, reject) => {
		const worker = new Worker(new URL('./screenshot.worker.ts', import.meta.url), { type: 'module' });
		const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
		worker.onmessage = (event: MessageEvent<{ id: string; blob?: Blob; error?: string }>) => {
			if (event.data.id !== id) return;
			worker.terminate();
			if (event.data.error) reject(new Error(event.data.error));
			else if (event.data.blob) resolve(event.data.blob);
			else reject(new Error('Screenshot rendering returned no image.'));
		};
		worker.onerror = () => {
			worker.terminate();
			reject(new Error('Screenshot rendering stopped unexpectedly. Try a smaller screenshot or a lower export scale.'));
		};
		worker.postMessage({ id, file, options });
	});
}
