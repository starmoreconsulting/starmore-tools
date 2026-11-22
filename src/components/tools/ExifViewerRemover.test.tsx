// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readJpegExif, stripJpegExif } from '../../engines/exif-tool';
import { triggerDownload } from '../../engines/pdf';
import ExifViewerRemover from './ExifViewerRemover';

vi.mock('../../engines/exif-tool', async (importOriginal) => {
	const actual = await importOriginal<typeof import('../../engines/exif-tool')>();
	return { ...actual, readJpegExif: vi.fn(), stripJpegExif: vi.fn() };
});

vi.mock('../../engines/pdf', async (importOriginal) => {
	const actual = await importOriginal<typeof import('../../engines/pdf')>();
	return { ...actual, triggerDownload: vi.fn() };
});

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
	container = document.createElement('div');
	document.body.append(container);
	root = createRoot(container);
	act(() => root.render(<ExifViewerRemover />));
	vi.mocked(readJpegExif).mockReset();
	vi.mocked(stripJpegExif).mockReset();
	vi.mocked(triggerDownload).mockReset();
});

afterEach(() => {
	act(() => root.unmount());
	container.remove();
});

function selectJpeg(name = 'photo.jpg', size = 8): void {
	const input = container.querySelector<HTMLInputElement>('#exif-viewer-file')!;
	const file = new File([new Uint8Array(size)], name, { type: 'image/jpeg' });
	vi.spyOn(file, 'arrayBuffer').mockResolvedValue(new Uint8Array(size).buffer);
	Object.defineProperty(input, 'files', { configurable: true, value: [file] });
	act(() => input.dispatchEvent(new Event('change', { bubbles: true })));
}

describe('ExifViewerRemover', () => {
	it('explains supported files, local processing, and metadata limitations', () => {
		expect(container.querySelector<HTMLInputElement>('#exif-viewer-file')?.accept).toContain('image/jpeg');
		expect(container.textContent).toContain('processed in your browser');
		expect(container.textContent).toContain('XMP or ICC profiles may remain');
	});

	it('displays EXIF tags and downloads the image after stripping EXIF', async () => {
		vi.mocked(readJpegExif).mockResolvedValue([{ name: 'Make', value: 'Canon' }, { name: 'GPSLatitude', value: '1.2' }]);
		vi.mocked(stripJpegExif).mockReturnValue({ bytes: new Uint8Array([1, 2, 3]), removed: true });
		await act(async () => {
			selectJpeg();
			await new Promise((resolve) => setTimeout(resolve, 0));
		});
		expect(container.textContent).toContain('Canon');
		expect(container.textContent).toContain('GPSLatitude');
		act(() => container.querySelector<HTMLButtonElement>('.tool-button')?.click());
		expect(triggerDownload).toHaveBeenCalledOnce();
		expect(triggerDownload).toHaveBeenCalledWith(expect.any(Blob), 'photo-without-exif.jpg');
		expect(container.textContent).toContain('without recompressing');
	});

	it('does not download when no EXIF segment is present', async () => {
		vi.mocked(readJpegExif).mockResolvedValue([]);
		vi.mocked(stripJpegExif).mockReturnValue({ bytes: new Uint8Array([1, 2, 3]), removed: false });
		await act(async () => {
			selectJpeg();
			await new Promise((resolve) => setTimeout(resolve, 0));
		});
		act(() => container.querySelector<HTMLButtonElement>('.tool-button')?.click());
		expect(triggerDownload).not.toHaveBeenCalled();
		expect(container.textContent).toContain('No EXIF metadata segment was found');
	});

	it('rejects files above the size limit before reading them', () => {
		selectJpeg('large.jpg', 50_000_001);
		expect(readJpegExif).not.toHaveBeenCalled();
		expect(container.textContent).toContain('exceeds the 50 MB limit');
	});
});
