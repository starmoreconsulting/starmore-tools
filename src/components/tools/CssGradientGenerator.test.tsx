// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CssGradientGenerator from './CssGradientGenerator';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const writeText = vi.fn();
let container: HTMLDivElement;
let root: Root;

function setValue(selector: string, value: string) {
	const input = container.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(selector);
	if (!input) throw new Error(`Missing input ${selector}`);
	const prototype = input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype
		: input instanceof HTMLSelectElement ? HTMLSelectElement.prototype
			: HTMLInputElement.prototype;
	Object.getOwnPropertyDescriptor(prototype, 'value')?.set?.call(input, value);
	input.dispatchEvent(new Event('input', { bubbles: true }));
	input.dispatchEvent(new Event('change', { bubbles: true }));
}

beforeEach(() => {
	writeText.mockReset();
	Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
	container = document.createElement('div');
	document.body.append(container);
	root = createRoot(container);
	act(() => root.render(<CssGradientGenerator />));
});

afterEach(() => { act(() => root.unmount()); container.remove(); });

describe('CssGradientGenerator', () => {
	it('shows and copies a linear gradient', async () => {
		const css = container.querySelector('#gradient-css-output')?.textContent;
		expect(css).toContain('linear-gradient(135deg');
		await act(async () => container.querySelectorAll<HTMLButtonElement>('.tool-actions button')[1]?.click());
		expect(writeText).toHaveBeenCalledWith(expect.stringContaining('linear-gradient'));
	});

	it('switches to radial gradient and adds a stop', () => {
		act(() => setValue('#gradient-type', 'radial'));
		expect(container.querySelector('#gradient-css-output')?.textContent).toContain('radial-gradient');
		act(() => container.querySelector<HTMLButtonElement>('.tool-actions button')?.click());
		expect(container.querySelectorAll('.gradient-stop-row')).toHaveLength(3);
	});

	it('updates angle and repeating mode', () => {
		act(() => setValue('#gradient-angle', '45'));
		const repeating = container.querySelector<HTMLInputElement>('label.tool-choice input');
		act(() => repeating?.click());
		expect(container.querySelector('#gradient-css-output')?.textContent).toContain('repeating-linear-gradient(45deg');
	});

	it('can reset gradient settings', () => {
		act(() => setValue('#gradient-angle', '12'));
		act(() => container.querySelectorAll<HTMLButtonElement>('.tool-actions button')[2]?.click());
		expect((container.querySelector('#gradient-angle') as HTMLInputElement)?.value).toBe('135');
		expect(container.querySelectorAll('.gradient-stop-row')).toHaveLength(2);
	});
});
