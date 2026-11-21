// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import RemoveExtraSpaces from './RemoveExtraSpaces';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
	container = document.createElement('div');
	document.body.append(container);
	root = createRoot(container);
	act(() => root.render(<RemoveExtraSpaces />));
});

afterEach(() => {
	act(() => root.unmount());
	container.remove();
});

describe('RemoveExtraSpaces', () => {
	it('cleans extra inline spaces and trims lines', () => {
		const input = container.querySelector<HTMLTextAreaElement>('#extra-spaces-input')!;
		act(() => {
			const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
			setter?.call(input, '  Hello   world  \n  Second\tline  ');
			input.dispatchEvent(new Event('input', { bubbles: true }));
		});
		const output = container.querySelector<HTMLTextAreaElement>('#extra-spaces-output')!;
		expect(output.value).toBe('Hello world\nSecond line');
	});

	it('can remove blank lines', () => {
		const input = container.querySelector<HTMLTextAreaElement>('#extra-spaces-input')!;
		act(() => {
			const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
			setter?.call(input, 'one\n\n\ntwo');
			input.dispatchEvent(new Event('input', { bubbles: true }));
		});
		const checkbox = [...container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')][2];
		act(() => checkbox.click());
		expect(container.querySelector<HTMLTextAreaElement>('#extra-spaces-output')?.value).toBe('one\ntwo');
	});
});
