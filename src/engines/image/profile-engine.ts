import { getImageInputType } from './toolkit';
import type { PassportMask, PassportRenderOptions } from './passport-engine';

export type ProfileShape = 'circle' | 'rounded-square' | 'square';
export type ProfileBackground =
	| { kind: 'solid'; color: string }
	| { kind: 'gradient'; start: string; end: string };

export interface ProfilePictureOptions {
	crop: PassportRenderOptions['crop'];
	size: number;
	shape: ProfileShape;
	background: ProfileBackground;
	ring: boolean;
	ringColor: string;
	ringWidth: number;
}

interface WorkerReply {
	id: string;
	blob?: Blob;
	error?: string;
}

export function renderProfilePicture(file: File, options: ProfilePictureOptions, mask?: PassportMask): Promise<Blob> {
	getImageInputType(file);
	return new Promise((resolve, reject) => {
		const worker = new Worker(new URL('./profile.worker.ts', import.meta.url), { type: 'module' });
		const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
		worker.onmessage = (event: MessageEvent<WorkerReply>) => {
			if (event.data.id !== id) return;
			worker.terminate();
			if (event.data.error) reject(new Error(event.data.error));
			else if (event.data.blob) resolve(event.data.blob);
			else reject(new Error('Profile picture processing returned no image.'));
		};
		worker.onerror = () => {
			worker.terminate();
			reject(new Error('Profile picture processing stopped unexpectedly. Try a smaller image.'));
		};
		const maskData = mask ? { ...mask, data: mask.data.slice().buffer } : undefined;
		worker.postMessage({ id, file, options, mask: maskData }, maskData ? [maskData.data] : []);
	});
}
