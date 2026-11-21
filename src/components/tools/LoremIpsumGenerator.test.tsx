// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import LoremIpsumGenerator from './LoremIpsumGenerator';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
	container = document.createElement('div');
	document.body.append(container);
	root = createRoot(container);
	act(() => root.render(<LoremIpsumGenerator />));
});

afterEach(() => {
	act(() => root.unmount());
	container.remove();
});

function setInput(id: string, value: string) {
	const input = container.querySelector<HTMLInputElement>(`#${id}`)!;
	act(() => {
		const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
		setter?.call(input, value);
		input.dispatchEvent(new Event('input', { bubbles: true }));
	});
}

describe('LoremIpsumGenerator', () => {
	it('generates paragraphs by default', () => {
		const output = container.querySelector<HTMLTextAreaElement>('#lorem-output')?.value || '';
		expect(output.split(/\n\n/)).toHaveLength(3);
	});

	it('supports word mode and rejects counts above 100', () => {
		const mode = container.querySelector<HTMLSelectElement>('#lorem-mode')!;
		act(() => {
			const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set;
			setter?.call(mode, 'words');
			mode.dispatchEvent(new Event('change', { bubbles: true }));
		});
		setInput('lorem-count', '10');
		const output = container.querySelector<HTMLTextAreaElement>('#lorem-output')?.value || '';
		expect(output.split(/\s+/).length).toBeGreaterThanOrEqual(10);
		setInput('lorem-count', '101');
		expect(container.querySelector('[role="status"]')?.textContent).toContain('1 to 100');
	});
});
