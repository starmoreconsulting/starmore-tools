// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import TextFormatter from './TextFormatter';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
	container = document.createElement('div');
	document.body.append(container);
	root = createRoot(container);
	act(() => root.render(<TextFormatter />));
});

afterEach(() => {
	act(() => root.unmount());
	container.remove();
});

describe('TextFormatter', () => {
	it('cleans and formats paragraph text', () => {
		const input = container.querySelector<HTMLTextAreaElement>('#text-format-input')!;
		act(() => {
			const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
			setter?.call(input, '  Hello   world  \n\n  Second  paragraph  ');
			input.dispatchEvent(new Event('input', { bubbles: true }));
		});
		expect(container.querySelector<HTMLTextAreaElement>('#text-format-output')?.value).toBe('Hello world\n\nSecond paragraph');
	});

	it('can format as a single line', () => {
		const input = container.querySelector<HTMLTextAreaElement>('#text-format-input')!;
		act(() => {
			const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
			setter?.call(input, 'Hello\nworld');
			input.dispatchEvent(new Event('input', { bubbles: true }));
		});
		act(() => container.querySelectorAll<HTMLInputElement>('input[type="radio"]')[2].click());
		expect(container.querySelector<HTMLTextAreaElement>('#text-format-output')?.value).toBe('Hello world');
	});
});
