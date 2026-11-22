// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import FileExtensionChecker from './FileExtensionChecker';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
	container = document.createElement('div');
	document.body.append(container);
	root = createRoot(container);
	act(() => root.render(<FileExtensionChecker />));
});

afterEach(() => {
	act(() => root.unmount());
	container.remove();
});

describe('FileExtensionChecker', () => {
	it('shows the extension and reference category for a known file', () => {
		const input = container.querySelector<HTMLInputElement>('#file-extension-name')!;
		act(() => {
			const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
			setter?.call(input, 'annual-report.xlsx');
			input.dispatchEvent(new Event('input', { bubbles: true }));
		});
		expect(container.textContent).toContain('.xlsx');
		expect(container.textContent).toContain('Spreadsheet');
		expect(container.textContent).toContain('Microsoft Excel workbook');
	});

	it('warns when an executable is disguised with a document extension', () => {
		const input = container.querySelector<HTMLInputElement>('#file-extension-name')!;
		act(() => {
			const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
			setter?.call(input, 'invoice.pdf.exe');
			input.dispatchEvent(new Event('input', { bubbles: true }));
		});
		expect(container.textContent).toContain('two extensions');
		expect(container.textContent).toContain('.exe');
	});

	it('states the tool cannot verify file contents or detect malware', () => {
		expect(container.textContent).toContain('does not inspect file contents');
		expect(container.textContent).toContain('scan for malware');
	});
});
