// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import LinkInBioCreator from './LinkInBioCreator';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let container: HTMLDivElement;
let root: Root;

function changeInput(input: HTMLInputElement, value: string) {
	const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
	setter?.call(input, value);
	input.dispatchEvent(new Event('input', { bubbles: true }));
}

beforeEach(() => {
	container = document.createElement('div');
	document.body.append(container);
	root = createRoot(container);
	act(() => root.render(<LinkInBioCreator />));
});

afterEach(() => {
	act(() => root.unmount());
	container.remove();
	vi.useRealTimers();
	vi.restoreAllMocks();
});

describe('LinkInBioCreator', () => {
	it('shows escaped standalone HTML and enables download for valid links', () => {
		const title = container.querySelector<HTMLInputElement>('#bio-page-title')!;
		const label = container.querySelector<HTMLInputElement>('#bio-link-label-0')!;
		const url = container.querySelector<HTMLInputElement>('#bio-link-url-0')!;

		act(() => {
			changeInput(title, '<My page>');
			changeInput(label, 'Portfolio');
			changeInput(url, 'https://example.com');
		});

		const html = container.querySelector<HTMLTextAreaElement>('[aria-label="Generated standalone HTML"]')?.value ?? '';
		expect(html).toContain('&lt;My page&gt;');
		expect(html).toContain('href="https://example.com/"');
		expect([...container.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent === 'Download HTML')?.disabled).toBe(false);
	});

	it('downloads the generated page as an HTML file', () => {
		vi.useFakeTimers();
		const createObjectUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:link-page');
		const revokeObjectUrl = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
		const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
		act(() => {
			[...container.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent === 'Download HTML')?.click();
		});

		expect(createObjectUrl).toHaveBeenCalledWith(expect.objectContaining({ type: 'text/html;charset=utf-8' }));
		expect(click).toHaveBeenCalledOnce();
		act(() => vi.advanceTimersByTime(1000));
		expect(revokeObjectUrl).toHaveBeenCalledWith('blob:link-page');
		expect(container.textContent).toContain('link-in-bio.html downloaded');
	});

	it('blocks unsafe links from generated output and download', () => {
		const url = container.querySelector<HTMLInputElement>('#bio-link-url-0')!;
		act(() => {
			changeInput(url, 'javascript:alert(1)');
		});
		expect(container.querySelector('[role="alert"]')?.textContent).toContain('valid HTTP or HTTPS URL');
		expect([...container.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent === 'Download HTML')?.disabled).toBe(true);
	});
});
