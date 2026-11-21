// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import EmailSignatureDesigner from './EmailSignatureDesigner';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
	container = document.createElement('div');
	document.body.append(container);
	root = createRoot(container);
	act(() => root.render(<EmailSignatureDesigner />));
});

afterEach(() => {
	act(() => root.unmount());
	container.remove();
});

describe('EmailSignatureDesigner', () => {
	it('renders profile fields, preview and HTML', () => {
		expect(container.querySelector('#signature-name')).not.toBeNull();
		expect(container.querySelector('iframe.signature-preview')).not.toBeNull();
		expect(container.querySelector<HTMLTextAreaElement>('#signature-html')?.value).toContain('table');
		expect(container.querySelectorAll('button')).toHaveLength(2);
	});

	it('updates the generated HTML', () => {
		const input = container.querySelector<HTMLInputElement>('#signature-name')!;
		act(() => {
			const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
			setter?.call(input, 'Ada Lovelace');
			input.dispatchEvent(new Event('input', { bubbles: true }));
		});
		expect(container.querySelector<HTMLTextAreaElement>('#signature-html')?.value).toContain('Ada Lovelace');
	});
});
