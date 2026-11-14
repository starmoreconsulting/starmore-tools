import { getImageInputType } from './toolkit';
import type { CollageLayout } from '../../data/collage-layouts';
import type { NormalizedPoint } from './composition-math';

export type CollageBackground =
	| { kind: 'solid'; color: string }
	| { kind: 'gradient'; start: string; end: string };

export interface CollageCell {
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface CollageOptions {
	width: number;
	height: number;
	spacing: number;
	padding: number;
	radius: number;
	background: CollageBackground;
	assignments: number[];
	zoom: number[];
	center: NormalizedPoint[];
}

export function calculateCollageCells(width: number, height: number, layout: CollageLayout, spacing: number, padding: number): CollageCell[] {
	if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1
		|| !Number.isFinite(spacing) || !Number.isFinite(padding) || spacing < 0 || padding < 0
		|| !layout.rows.length || layout.rows.some((count) => !Number.isSafeInteger(count) || count < 1)
		|| layout.rows.reduce((total, count) => total + count, 0) !== layout.photoCount) {
		throw new Error('The collage dimensions or layout are invalid.');
	}
	const innerWidth = width - padding * 2;
	const innerHeight = height - padding * 2;
	const cellHeight = (innerHeight - spacing * (layout.rows.length - 1)) / layout.rows.length;
	if (innerWidth <= 0 || cellHeight <= 0) throw new Error('Spacing and padding leave no room for the collage photos.');
	const cells: CollageCell[] = [];
	let y = padding;
	for (const columns of layout.rows) {
		const cellWidth = (innerWidth - spacing * (columns - 1)) / columns;
		if (cellWidth <= 0) throw new Error('Spacing and padding leave no room for the collage photos.');
		for (let column = 0; column < columns; column += 1) {
			cells.push({
				x: padding + column * (cellWidth + spacing),
				y,
				width: cellWidth,
				height: cellHeight,
			});
		}
		y += cellHeight + spacing;
	}
	return cells;
}

export function renderCollage(files: File[], layout: CollageLayout, options: CollageOptions, format: 'image/png' | 'image/jpeg'): Promise<Blob> {
	if (files.length !== layout.photoCount || options.assignments.length !== files.length || options.assignments.some((index) => !Number.isSafeInteger(index) || index < 0 || index >= files.length)
		|| new Set(options.assignments).size !== files.length) {
		return Promise.reject(new Error('Every collage cell must use one of the selected photos exactly once.'));
	}
	for (const file of files) getImageInputType(file);
	return new Promise((resolve, reject) => {
		const worker = new Worker(new URL('./collage.worker.ts', import.meta.url), { type: 'module' });
		const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
		worker.onmessage = (event: MessageEvent<{ id: string; blob?: Blob; error?: string }>) => {
			if (event.data.id !== id) return;
			worker.terminate();
			if (event.data.error) reject(new Error(event.data.error));
			else if (event.data.blob) resolve(event.data.blob);
			else reject(new Error('Collage processing returned no image.'));
		};
		worker.onerror = () => {
			worker.terminate();
			reject(new Error('Collage processing stopped unexpectedly. Try fewer or smaller photos.'));
		};
		worker.postMessage({ id, files, layout, options, format });
	});
}
