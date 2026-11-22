// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { zipSync } from 'fflate';
import ZipExtractor from './ZipExtractor';

const { triggerDownload } = vi.hoisted(() => ({ triggerDownload: vi.fn() }));
vi.mock('../../engines/pdf', () => ({ triggerDownload }));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
	triggerDownload.mockReset();
	container = document.createElement('div');
	document.body.append(container);
	root = createRoot(container);
	act(() => root.render(<ZipExtractor />));
});

afterEach(() => {
	act(() => root.unmount());
	container.remove();
});

describe('ZipExtractor', () => {
	it('renders archive upload and local privacy guidance', () => {
		expect(container.querySelector<HTMLInputElement>('#zip-extractor-file')?.accept).toContain('.zip');
		expect(container.textContent).toContain('nothing is uploaded');
	});

	it('lists files and downloads an extracted file', async () => {
		const bytes = zipSync({ 'folder/notes.txt': new TextEncoder().encode('hello') });
		const file = new File([bytes], 'bundle.zip');
		const input = container.querySelector<HTMLInputElement>('#zip-extractor-file')!;
		Object.defineProperty(input, 'files', { configurable: true, value: [file] });
		await act(async () => {
			input.dispatchEvent(new Event('change', { bubbles: true }));
			await new Promise((resolve) => setTimeout(resolve, 0));
		});

		expect(container.textContent).toContain('Found 1 file');
		expect(container.textContent).toContain('folder/notes.txt');
		await act(async () => {
			container.querySelector<HTMLButtonElement>('button')?.click();
			await new Promise((resolve) => setTimeout(resolve, 0));
		});
		expect(triggerDownload).toHaveBeenCalledOnce();
		expect(triggerDownload.mock.calls[0][1]).toBe('notes.txt');
		expect(container.textContent).toContain('Extracted notes.txt');
	});

	it('rejects archives exceeding the input size limit', async () => {
		const file = new File(['x'], 'large.zip');
		Object.defineProperty(file, 'size', { configurable: true, value: 20_000_001 });
		const input = container.querySelector<HTMLInputElement>('#zip-extractor-file')!;
		Object.defineProperty(input, 'files', { configurable: true, value: [file] });
		await act(async () => {
			input.dispatchEvent(new Event('change', { bubbles: true }));
		});
		expect(container.textContent).toContain('no larger than 20 MB');
	});
});
