import oswaldFontUrl from '@fontsource/oswald/files/oswald-latin-700-normal.woff2?url';
import { getImageInputType } from './toolkit';
import type { NormalizedPoint } from './composition-math';

export interface MemeTextBox {
	id: string;
	text: string;
	center: NormalizedPoint;
	width: number;
	height: number;
	size: number;
}

export interface MemeOptions {
	width: number;
	height: number;
	background: string;
	topText: string;
	bottomText: string;
	freeTexts: MemeTextBox[];
	uppercase: boolean;
	strokeWidth: number;
	format: 'image/png' | 'image/jpeg';
}

export function renderMeme(file: File | null, options: MemeOptions): Promise<Blob> {
	if (file) getImageInputType(file);
	return new Promise((resolve, reject) => {
		const worker = new Worker(new URL('./meme.worker.ts', import.meta.url), { type: 'module' });
		const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
		worker.onmessage = (event: MessageEvent<{ id: string; blob?: Blob; error?: string }>) => {
			if (event.data.id !== id) return;
			worker.terminate();
			if (event.data.error) reject(new Error(event.data.error));
			else if (event.data.blob) resolve(event.data.blob);
			else reject(new Error('Meme rendering returned no image.'));
		};
		worker.onerror = () => {
			worker.terminate();
			reject(new Error('Meme rendering stopped unexpectedly. Try a smaller image.'));
		};
		worker.postMessage({ id, file, options, fontUrl: oswaldFontUrl });
	});
}
