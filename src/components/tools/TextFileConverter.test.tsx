// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { triggerDownload } from '../../engines/pdf';
import TextFileConverter from './TextFileConverter';

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
	act(() => root.render(<TextFileConverter />));
	vi.mocked(triggerDownload).mockReset();
});

afterEach(() => {
	act(() => root.unmount());
	container.remove();
});

describe('TextFileConverter', () => {
	it('renders file loading, source/target format selectors, and privacy notes', () => {
		expect(container.querySelector<HTMLInputElement>('#text-file-converter-file')?.accept).toContain('.md');
		expect(container.querySelectorAll('select')).toHaveLength(2);
		expect(container.textContent).toContain('Files are not uploaded');
	});

	it('converts plain text to HTML and downloads the chosen format', () => {
		const sourceFormat = container.querySelector<HTMLSelectElement>('#text-file-converter-source-format')!;
		const targetFormat = container.querySelector<HTMLSelectElement>('#text-file-converter-target-format')!;
		const source = container.querySelector<HTMLTextAreaElement>('#text-file-converter-source')!;
		act(() => {
			sourceFormat.value = 'text';
			sourceFormat.dispatchEvent(new Event('change', { bubbles: true }));
			targetFormat.value = 'html';
			targetFormat.dispatchEvent(new Event('change', { bubbles: true }));
			Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set?.call(source, 'Hello <world>');
			source.dispatchEvent(new Event('input', { bubbles: true }));
		});
		act(() => container.querySelector<HTMLButtonElement>('.tool-button')?.click());
		expect(container.querySelector<HTMLTextAreaElement>('#text-file-converter-output')?.value).toBe('<p>Hello &lt;world&gt;</p>');
		act(() => container.querySelectorAll<HTMLButtonElement>('.tool-button')[1]?.click());
		expect(triggerDownload).toHaveBeenCalledWith(expect.any(Blob), 'converted-text.html');
	});

	it('reads an uploaded Markdown file and detects its source format', async () => {
		const input = container.querySelector<HTMLInputElement>('#text-file-converter-file')!;
		const file = new File(['# Heading'], 'notes.md', { type: 'text/markdown' });
		vi.spyOn(file, 'text').mockResolvedValue('# Heading');
		Object.defineProperty(input, 'files', { configurable: true, value: [file] });
		await act(async () => {
			input.dispatchEvent(new Event('change', { bubbles: true }));
			await new Promise((resolve) => setTimeout(resolve, 0));
		});
		expect(container.querySelector<HTMLSelectElement>('#text-file-converter-source-format')?.value).toBe('markdown');
		expect(container.querySelector<HTMLTextAreaElement>('#text-file-converter-source')?.value).toBe('# Heading');
	});

	it('rejects unsupported files and files over the size limit', () => {
		const input = container.querySelector<HTMLInputElement>('#text-file-converter-file')!;
		const wrongType = new File(['{}'], 'data.json');
		Object.defineProperty(input, 'files', { configurable: true, value: [wrongType] });
		act(() => input.dispatchEvent(new Event('change', { bubbles: true })));
		expect(container.textContent).toContain('Choose a .txt, .md, .markdown, .html, or .htm file');

		const largeFile = new File([new Uint8Array(5_000_001)], 'large.txt');
		Object.defineProperty(input, 'files', { configurable: true, value: [largeFile] });
		act(() => input.dispatchEvent(new Event('change', { bubbles: true })));
		expect(container.textContent).toContain('exceeds the 5 MB limit');
	});
});
