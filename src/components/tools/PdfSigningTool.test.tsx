// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import PdfSigningTool from './PdfSigningTool';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
	container = document.createElement('div');
	document.body.append(container);
	root = createRoot(container);
	act(() => root.render(<PdfSigningTool />));
});

afterEach(() => {
	act(() => root.unmount());
	container.remove();
});

describe('PdfSigningTool', () => {
	it('renders signature, page, and placement controls', () => {
		expect(container.querySelector('#pdf-sign-file')).not.toBeNull();
		expect(container.querySelector('#pdf-sign-mode')).not.toBeNull();
		expect(container.querySelector('#pdf-sign-canvas')).not.toBeNull();
		expect(container.querySelector('#pdf-sign-pages')).not.toBeNull();
		const signButton = Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find((button) => button.textContent?.includes('Add signature'));
		expect(signButton?.disabled).toBe(true);
		expect(container.textContent).toContain('does not create a certificate-based digital signature');
	});

	it('switches between draw, typed, and uploaded signatures', () => {
		const mode = container.querySelector<HTMLSelectElement>('#pdf-sign-mode')!;
		act(() => {
			mode.value = 'type';
			mode.dispatchEvent(new Event('change', { bubbles: true }));
		});
		expect(container.querySelector('#pdf-sign-name')).not.toBeNull();

		act(() => {
			mode.value = 'upload';
			mode.dispatchEvent(new Event('change', { bubbles: true }));
		});
		expect(container.querySelector('#pdf-sign-image')).not.toBeNull();
	});
});
