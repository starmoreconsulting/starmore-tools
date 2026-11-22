// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DocumentScanner from './DocumentScanner';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
	container = document.createElement('div');
	document.body.append(container);
	root = createRoot(container);
	act(() => root.render(<DocumentScanner />));
});

afterEach(() => {
	act(() => root.unmount());
	container.remove();
	vi.restoreAllMocks();
});

describe('DocumentScanner', () => {
	it('renders camera and image inputs and explains local processing', () => {
		expect(container.querySelector<HTMLInputElement>('#document-scanner-file')?.accept).toContain('image/*');
		expect(container.textContent).toContain('Use camera');
		expect(container.textContent).toContain('processed on your device');
		expect(container.textContent).toContain('not searchable');
	});

	it('reports unavailable camera access explicitly', async () => {
		Object.defineProperty(navigator, 'mediaDevices', {
			configurable: true,
			value: undefined,
		});
		await act(async () => {
			container.querySelector<HTMLButtonElement>('.tool-button.secondary')?.click();
			await new Promise((resolve) => setTimeout(resolve, 0));
		});
		expect(container.textContent).toContain('Camera access is not available here');
	});

	it('rejects non-image uploads before decoding them', () => {
		const input = container.querySelector<HTMLInputElement>('#document-scanner-file')!;
		const file = new File(['data'], 'notes.txt', { type: 'text/plain' });
		Object.defineProperty(input, 'files', { configurable: true, value: [file] });
		act(() => input.dispatchEvent(new Event('change', { bubbles: true })));
		expect(container.textContent).toContain('Choose an image file such as JPG, PNG, or WebP');
	});
});
