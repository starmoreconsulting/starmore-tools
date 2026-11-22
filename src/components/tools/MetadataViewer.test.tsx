// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import MetadataViewer from './MetadataViewer';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
	container = document.createElement('div');
	document.body.append(container);
	root = createRoot(container);
	act(() => root.render(<MetadataViewer />));
});

afterEach(() => {
	vi.restoreAllMocks();
	act(() => root.unmount());
	container.remove();
});

describe('MetadataViewer', () => {
	it('renders file selection and explains browser metadata limits', () => {
		expect(container.querySelector<HTMLInputElement>('#metadata-viewer-file')).not.toBeNull();
		expect(container.textContent).toContain('does not verify the actual file format');
		expect(container.textContent).toContain('or upload the file');
	});

	it('displays basic metadata for a selected file', () => {
		const input = container.querySelector<HTMLInputElement>('#metadata-viewer-file')!;
		const file = new File(['hello'], 'notes.txt', { type: 'text/plain', lastModified: Date.parse('2025-01-02T03:04:05.000Z') });
		Object.defineProperty(input, 'files', { configurable: true, value: [file] });
		act(() => input.dispatchEvent(new Event('change', { bubbles: true })));
		expect(container.textContent).toContain('notes.txt');
		expect(container.textContent).toContain('.txt');
		expect(container.textContent).toContain('text/plain');
		expect(container.textContent).toContain('5 bytes');
		expect(container.textContent).not.toContain('Image dimensions');
	});

	it('reads image dimensions locally and clears the result', async () => {
		const close = vi.fn();
		vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ width: 640, height: 480, close })));
		const input = container.querySelector<HTMLInputElement>('#metadata-viewer-file')!;
		const file = new File(['image'], 'photo.png', { type: 'image/png' });
		Object.defineProperty(input, 'files', { configurable: true, value: [file] });
		await act(async () => {
			input.dispatchEvent(new Event('change', { bubbles: true }));
			await new Promise((resolve) => setTimeout(resolve, 0));
		});
		expect(container.textContent).toContain('640 × 480 px');
		expect(close).toHaveBeenCalledOnce();
		act(() => container.querySelector<HTMLButtonElement>('button')?.click());
		expect(container.textContent).not.toContain('photo.png');
	});

	it('closes the image bitmap and preserves basic metadata when dimensions cannot be read', async () => {
		const close = vi.fn();
		vi.stubGlobal('createImageBitmap', vi.fn(async () => ({
			get width() { throw new Error('decode failed'); },
			height: 480,
			close,
		})));
		const input = container.querySelector<HTMLInputElement>('#metadata-viewer-file')!;
		const file = new File(['image'], 'photo.png', { type: 'image/png' });
		Object.defineProperty(input, 'files', { configurable: true, value: [file] });
		await act(async () => {
			input.dispatchEvent(new Event('change', { bubbles: true }));
			await new Promise((resolve) => setTimeout(resolve, 0));
		});
		expect(close).toHaveBeenCalledOnce();
		expect(container.textContent).toContain('photo.png');
		expect(container.textContent).toContain('Image dimensions could not be read: decode failed');
	});
});
