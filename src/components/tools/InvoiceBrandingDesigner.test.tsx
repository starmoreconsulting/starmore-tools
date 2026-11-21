// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import InvoiceBrandingDesigner from './InvoiceBrandingDesigner';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
	container = document.createElement('div');
	document.body.append(container);
	root = createRoot(container);
	act(() => root.render(<InvoiceBrandingDesigner />));
});

afterEach(() => { act(() => root.unmount()); container.remove(); });

describe('InvoiceBrandingDesigner', () => {
	it('shows a branded invoice preview and totals', () => {
		expect(container.querySelector('.invoice-preview')).not.toBeNull();
		expect(container.querySelector('.invoice-preview')?.textContent).toContain('Design service');
		expect(container.querySelector('.invoice-totals')?.textContent).toContain('100.00');
	});

	it('adds an invoice item', () => {
		act(() => Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find((button) => button.textContent?.includes('Add item'))?.click());
		expect(container.querySelectorAll('.invoice-item')).toHaveLength(2);
	});
});
