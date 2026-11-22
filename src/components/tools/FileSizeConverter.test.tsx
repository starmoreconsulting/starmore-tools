// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import FileSizeConverter from './FileSizeConverter';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
	container = document.createElement('div');
	document.body.append(container);
	root = createRoot(container);
	act(() => root.render(<FileSizeConverter />));
});

afterEach(() => {
	act(() => root.unmount());
	container.remove();
});

function setValue(element: HTMLInputElement | HTMLSelectElement, value: string): void {
	const prototype = element instanceof HTMLInputElement ? HTMLInputElement.prototype : HTMLSelectElement.prototype;
	const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
	setter?.call(element, value);
	element.dispatchEvent(new Event('input', { bubbles: true }));
	element.dispatchEvent(new Event('change', { bubbles: true }));
}

describe('FileSizeConverter', () => {
	it('converts a decimal megabyte to binary mebibytes', () => {
		act(() => {
			setValue(container.querySelector<HTMLInputElement>('#file-size-amount')!, '1');
		});
		expect(container.querySelector('.calc-result.featured strong')?.textContent).toBe('0.95367432');
		expect(container.textContent).toContain('KB, MB, GB and TB use decimal units');
	});

	it('supports choosing units and swapping direction', () => {
		act(() => {
			setValue(container.querySelector<HTMLInputElement>('#file-size-amount')!, '1');
			setValue(container.querySelector<HTMLSelectElement>('#file-size-from')!, 'GiB');
			setValue(container.querySelector<HTMLSelectElement>('#file-size-to')!, 'GB');
		});
		expect(container.querySelector('.calc-result.featured strong')?.textContent).toBe('1.07374182');
		act(() => container.querySelector<HTMLButtonElement>('[aria-label="Swap file size units"]')?.click());
		expect(container.querySelector<HTMLSelectElement>('#file-size-from')?.value).toBe('GB');
		expect(container.querySelector<HTMLSelectElement>('#file-size-to')?.value).toBe('GiB');
	});

	it('shows validation feedback for invalid values', () => {
		act(() => {
			setValue(container.querySelector<HTMLInputElement>('#file-size-amount')!, '-2');
		});
		expect(container.textContent).toContain('finite, non-negative');
	});
});
