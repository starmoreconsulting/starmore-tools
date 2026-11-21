// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import OldPhotoRestoration from './OldPhotoRestoration';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
	container = document.createElement('div');
	document.body.append(container);
	root = createRoot(container);
	act(() => root.render(<OldPhotoRestoration />));
});

afterEach(() => {
	act(() => root.unmount());
	container.remove();
});

describe('OldPhotoRestoration', () => {
	it('renders controls and starts disabled', () => {
		expect(container.querySelector<HTMLInputElement>('#old-photo-file')).not.toBeNull();
		expect(container.querySelector<HTMLButtonElement>('button[type="button"]')?.disabled).toBe(true);
		expect(container.querySelector('[role="status"]')?.textContent).toContain('old or faded photo');
	});

	it('offers the expected restoration controls', () => {
		expect(container.querySelector('#old-photo-fade')).not.toBeNull();
		expect(container.querySelector('#old-photo-contrast')).not.toBeNull();
		expect(container.querySelector('#old-photo-warmth')).not.toBeNull();
		expect(container.querySelector('#old-photo-denoise')).not.toBeNull();
		expect(container.querySelector('#old-photo-format')).not.toBeNull();
	});
});
