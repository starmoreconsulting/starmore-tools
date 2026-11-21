// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import ReverseTextGenerator from './ReverseTextGenerator';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
	container = document.createElement('div');
	document.body.append(container);
	root = createRoot(container);
	act(() => root.render(<ReverseTextGenerator />));
});

afterEach(() => {
	act(() => root.unmount());
	container.remove();
});

describe('ReverseTextGenerator', () => {
	it('reverses characters', () => {
		const input = container.querySelector<HTMLTextAreaElement>('#reverse-input')!;
		act(() => {
			const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
			setter?.call(input, 'A🌿B');
			input.dispatchEvent(new Event('input', { bubbles: true }));
		});
		expect(container.querySelector<HTMLTextAreaElement>('#reverse-output')?.value).toBe('B🌿A');
	});

	it('can reverse words and lines', () => {
		const input = container.querySelector<HTMLTextAreaElement>('#reverse-input')!;
		act(() => {
			const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
			setter?.call(input, 'Hello world');
			input.dispatchEvent(new Event('input', { bubbles: true }));
		});
		act(() => container.querySelectorAll<HTMLInputElement>('input[type="radio"]')[1].click());
		expect(container.querySelector<HTMLTextAreaElement>('#reverse-output')?.value).toBe('world Hello');
		act(() => {
			setterValue(input, 'one\ntwo');
			input.dispatchEvent(new Event('input', { bubbles: true }));
			container.querySelectorAll<HTMLInputElement>('input[type="radio"]')[2].click();
		});
		expect(container.querySelector<HTMLTextAreaElement>('#reverse-output')?.value).toBe('two\none');
	});
});

function setterValue(input: HTMLTextAreaElement, value: string) {
	Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set?.call(input, value);
}
