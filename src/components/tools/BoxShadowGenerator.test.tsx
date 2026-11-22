// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import BoxShadowGenerator from './BoxShadowGenerator';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const writeText = vi.fn();
let container: HTMLDivElement;
let root: Root;

function setNumber(selector: string, value: string) {
	const input = container.querySelector<HTMLInputElement>(selector);
	if (!input) throw new Error(`Missing input ${selector}`);
	Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, value);
	input.dispatchEvent(new Event('input', { bubbles: true }));
	input.dispatchEvent(new Event('change', { bubbles: true }));
}

beforeEach(() => {
	writeText.mockReset();
	Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
	container = document.createElement('div');
	document.body.append(container);
	root = createRoot(container);
	act(() => root.render(<BoxShadowGenerator />));
});

afterEach(() => { act(() => root.unmount()); container.remove(); });

describe('BoxShadowGenerator', () => {
	it('shows default CSS and copies it', async () => {
		expect(container.querySelector('#box-shadow-css-output')?.textContent).toBe('box-shadow: 12px 12px 24px 0px rgba(38, 50, 56, 0.25);');
		await act(async () => container.querySelector<HTMLButtonElement>('.tool-actions button')?.click());
		expect(writeText).toHaveBeenCalledWith('box-shadow: 12px 12px 24px 0px rgba(38, 50, 56, 0.25);');
	});

	it('updates offsets and enables inset mode', () => {
		act(() => setNumber('#shadow-horizontal', '-20'));
		act(() => setNumber('#shadow-vertical', '8'));
		act(() => setNumber('#shadow-blur', '5'));
		act(() => container.querySelector<HTMLInputElement>('#shadow-inset')?.click());
		expect(container.querySelector('#box-shadow-css-output')?.textContent).toContain('-20px 8px 5px');
		expect(container.querySelector('#box-shadow-css-output')?.textContent).toContain('inset');
	});

	it('resets the shadow controls', () => {
		act(() => setNumber('#shadow-horizontal', '30'));
		act(() => setNumber('#shadow-opacity', '60'));
		act(() => container.querySelectorAll<HTMLButtonElement>('.tool-actions button')[1]?.click());
		expect((container.querySelector('#shadow-horizontal') as HTMLInputElement)?.value).toBe('12');
		expect((container.querySelector('#shadow-opacity') as HTMLInputElement)?.value).toBe('25');
	});
});
