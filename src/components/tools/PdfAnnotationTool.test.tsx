// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PdfAnnotationTool from './PdfAnnotationTool';

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

beforeEach(() => {
	container = document.createElement('div');
	document.body.append(container);
	root = createRoot(container);
	act(() => root.render(<PdfAnnotationTool />));
	mocks.getDocument.mockReset();
});

afterEach(() => {
	act(() => root.unmount());
	container.remove();
});

describe('PdfAnnotationTool', () => {
	it('renders local PDF selection and explains annotation limitations', () => {
		expect(container.querySelector<HTMLInputElement>('#pdf-annotation-file')?.accept).toContain('.pdf');
		expect(container.textContent).toContain('flattened into the page content');
		expect(container.textContent).toContain('not editable comment annotations');
	});

	it('rejects PDFs larger than 50 MB before opening them', () => {
		const input = container.querySelector<HTMLInputElement>('#pdf-annotation-file')!;
		const file = new File([new Uint8Array(50_000_001)], 'large.pdf', { type: 'application/pdf' });
		Object.defineProperty(input, 'files', { configurable: true, value: [file] });
		act(() => input.dispatchEvent(new Event('change', { bubbles: true })));
		expect(mocks.getDocument).not.toHaveBeenCalled();
		expect(container.textContent).toContain('exceeds the 50 MB limit');
	});
});
