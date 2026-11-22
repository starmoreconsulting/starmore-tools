// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PdfComparisonTool from './PdfComparisonTool';

const mocks = vi.hoisted(() => ({
	getDocument: vi.fn(),
	workerOptions: {} as { workerSrc?: string },
}));

vi.mock('pdfjs-dist', () => ({
	GlobalWorkerOptions: mocks.workerOptions,
	getDocument: mocks.getDocument,
}));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let container: HTMLDivElement;
let root: Root;

function makeDocument(numPages: number) {
	const render = vi.fn(() => ({ promise: Promise.resolve(), cancel: vi.fn() }));
	const document = {
		numPages,
		destroy: vi.fn(async () => {}),
		getPage: vi.fn(async () => ({
			getViewport: ({ scale }: { scale: number }) => ({ width: 600 * scale, height: 800 * scale }),
			render,
		})),
		getData: vi.fn(async () => new Uint8Array([1, 2, 3])),
	};
	return { document, render };
}

async function chooseFile(inputId: string, name: string) {
	const input = container.querySelector<HTMLInputElement>(`#${inputId}`)!;
	const file = new File(['pdf'], name, { type: 'application/pdf' });
	vi.spyOn(file, 'arrayBuffer').mockResolvedValue(new Uint8Array([1, 2, 3]).buffer);
	Object.defineProperty(input, 'files', { configurable: true, value: [file] });
	await act(async () => {
		input.dispatchEvent(new Event('change', { bubbles: true }));
		await new Promise((resolve) => setTimeout(resolve, 0));
	});
}

beforeEach(() => {
	container = document.createElement('div');
	document.body.append(container);
	root = createRoot(container);
	vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as CanvasRenderingContext2D);
	act(() => root.render(<PdfComparisonTool />));
	mocks.getDocument.mockReset();
});

afterEach(() => {
	act(() => root.unmount());
	container.remove();
	vi.restoreAllMocks();
});

describe('PdfComparisonTool', () => {
	it('renders two local PDF inputs and states the visual-only comparison limitation', () => {
		expect(container.querySelector<HTMLInputElement>('#pdf-comparison-a')?.accept).toContain('.pdf');
		expect(container.querySelector<HTMLInputElement>('#pdf-comparison-b')?.accept).toContain('.pdf');
		expect(container.textContent).toContain('does not calculate an automatic difference score');
	});

	it('loads two PDFs, renders the matching page previews, and identifies missing pages', async () => {
		const first = makeDocument(1);
		const second = makeDocument(2);
		mocks.getDocument
			.mockReturnValueOnce({ promise: Promise.resolve(first.document) })
			.mockReturnValueOnce({ promise: Promise.resolve(second.document) });
		await chooseFile('pdf-comparison-a', 'first.pdf');
		await chooseFile('pdf-comparison-b', 'second.pdf');
		expect(container.textContent).toContain('Page count differs by 1');
		expect(container.querySelectorAll('.pdf-comparison-side')).toHaveLength(2);
		expect(first.document.getPage).toHaveBeenCalledWith(1);
		expect(second.document.getPage).toHaveBeenCalledWith(1);

		await act(async () => {
			container.querySelector<HTMLButtonElement>('.pdf-comparison-controls button:last-child')?.click();
			await new Promise((resolve) => setTimeout(resolve, 0));
		});
		expect(container.textContent).toContain('No page 2 in this PDF.');
		expect(second.document.getPage).toHaveBeenCalledWith(2);
	});

	it('rejects a PDF larger than the per-file limit without parsing', () => {
		const input = container.querySelector<HTMLInputElement>('#pdf-comparison-a')!;
		const file = new File([new Uint8Array(50_000_001)], 'large.pdf', { type: 'application/pdf' });
		Object.defineProperty(input, 'files', { configurable: true, value: [file] });
		act(() => input.dispatchEvent(new Event('change', { bubbles: true })));
		expect(mocks.getDocument).not.toHaveBeenCalled();
		expect(container.textContent).toContain('exceeds the 50 MB limit');
	});
});
