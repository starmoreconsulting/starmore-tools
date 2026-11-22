// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PdfTextExtractor from './PdfTextExtractor';
import { triggerDownload } from '../../engines/pdf';

const mocks = vi.hoisted(() => ({
	getDocument: vi.fn(),
	workerOptions: {} as { workerSrc?: string },
}));

vi.mock('pdfjs-dist', () => ({
	GlobalWorkerOptions: mocks.workerOptions,
	getDocument: mocks.getDocument,
}));

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
	act(() => root.render(<PdfTextExtractor />));
	mocks.getDocument.mockReset();
	vi.mocked(triggerDownload).mockReset();
});

afterEach(() => {
	act(() => root.unmount());
	container.remove();
});

describe('PdfTextExtractor', () => {
	it('renders local PDF selection and explains selectable-text limitations', () => {
		expect(container.querySelector<HTMLInputElement>('#pdf-text-extractor-file')?.accept).toContain('.pdf');
		expect(container.textContent).toContain('Scanned pages that contain only images');
	});

	it('rejects PDFs larger than 50 MB before parsing', () => {
		const input = container.querySelector<HTMLInputElement>('#pdf-text-extractor-file')!;
		const file = new File([new Uint8Array(50_000_001)], 'large.pdf', { type: 'application/pdf' });
		Object.defineProperty(input, 'files', { configurable: true, value: [file] });
		act(() => input.dispatchEvent(new Event('change', { bubbles: true })));
		expect(mocks.getDocument).not.toHaveBeenCalled();
		expect(container.textContent).toContain('exceeds the 50 MB limit');
	});

	it('loads PDF page count and validates a range before starting extraction', async () => {
		const document = { numPages: 4, destroy: vi.fn(async () => {}) };
		mocks.getDocument.mockReturnValue({ promise: Promise.resolve(document) });
		const input = container.querySelector<HTMLInputElement>('#pdf-text-extractor-file')!;
		const file = new File(['pdf'], 'report.pdf', { type: 'application/pdf' });
		vi.spyOn(file, 'arrayBuffer').mockResolvedValue(new Uint8Array([1, 2, 3]).buffer);
		Object.defineProperty(input, 'files', { configurable: true, value: [file] });
		await act(async () => {
			input.dispatchEvent(new Event('change', { bubbles: true }));
			await new Promise((resolve) => setTimeout(resolve, 0));
		});
		expect(container.querySelector<HTMLInputElement>('#pdf-text-extractor-pages')?.value).toBe('1-4');
		expect(document.destroy).toHaveBeenCalledOnce();
	});

	it('extracts selected page text and downloads a text file', async () => {
		const parsedPage = {
			getTextContent: vi.fn(async () => ({
				items: [{ str: 'Extracted page text', dir: 'ltr', transform: [1, 0, 0, 10, 0, 10], width: 110, height: 10, fontName: 'font', hasEOL: true }],
			})),
			cleanup: vi.fn(),
		};
		const loadedDocument = { numPages: 1, destroy: vi.fn(async () => {}) };
		const extractionDocument = {
			numPages: 1,
			getPage: vi.fn(async () => parsedPage),
			destroy: vi.fn(async () => {}),
		};
		mocks.getDocument
			.mockReturnValueOnce({ promise: Promise.resolve(loadedDocument) })
			.mockReturnValueOnce({ promise: Promise.resolve(extractionDocument) });

		const input = container.querySelector<HTMLInputElement>('#pdf-text-extractor-file')!;
		const file = new File(['pdf'], 'notes.pdf', { type: 'application/pdf' });
		vi.spyOn(file, 'arrayBuffer').mockResolvedValue(new Uint8Array([1, 2, 3]).buffer);
		Object.defineProperty(input, 'files', { configurable: true, value: [file] });
		await act(async () => {
			input.dispatchEvent(new Event('change', { bubbles: true }));
			await new Promise((resolve) => setTimeout(resolve, 0));
		});
		await act(async () => {
			container.querySelector<HTMLButtonElement>('.tool-button')?.click();
			await new Promise((resolve) => setTimeout(resolve, 0));
		});

		expect(container.querySelector<HTMLTextAreaElement>('#pdf-text-extractor-output')?.value).toContain('Extracted page text');
		expect(parsedPage.cleanup).toHaveBeenCalledOnce();
		expect(extractionDocument.destroy).toHaveBeenCalledOnce();
		act(() => container.querySelectorAll<HTMLButtonElement>('.tool-button')[2]?.click());
		expect(triggerDownload).toHaveBeenCalledWith(expect.any(Blob), 'notes-extracted.txt');
	});

	it('reports an invalid page range without trying to extract it', async () => {
		const document = { numPages: 2, destroy: vi.fn(async () => {}) };
		mocks.getDocument.mockReturnValue({ promise: Promise.resolve(document) });
		const input = container.querySelector<HTMLInputElement>('#pdf-text-extractor-file')!;
		const file = new File(['pdf'], 'notes.pdf', { type: 'application/pdf' });
		vi.spyOn(file, 'arrayBuffer').mockResolvedValue(new Uint8Array([1, 2, 3]).buffer);
		Object.defineProperty(input, 'files', { configurable: true, value: [file] });
		await act(async () => {
			input.dispatchEvent(new Event('change', { bubbles: true }));
			await new Promise((resolve) => setTimeout(resolve, 0));
		});
		const range = container.querySelector<HTMLInputElement>('#pdf-text-extractor-pages')!;
		act(() => {
			Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(range, '1-3');
			range.dispatchEvent(new Event('input', { bubbles: true }));
		});
		await act(async () => {
			container.querySelector<HTMLButtonElement>('.tool-button')?.click();
			await new Promise((resolve) => setTimeout(resolve, 0));
		});
		expect(container.textContent).toContain('outside the document');
		expect(mocks.getDocument).toHaveBeenCalledOnce();
	});
});
