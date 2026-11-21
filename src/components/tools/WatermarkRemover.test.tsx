// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import WatermarkRemover from './WatermarkRemover';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
	container = document.createElement('div');
	document.body.append(container);
	root = createRoot(container);
	act(() => root.render(<WatermarkRemover />));
});

afterEach(() => {
	act(() => root.unmount());
	container.remove();
});

describe('WatermarkRemover', () => {
	it('shows the owned-image warning and controls', () => {
		expect(container.querySelector<HTMLInputElement>('#watermark-remover-file')).not.toBeNull();
		expect(container.querySelector<HTMLInputElement>('#watermark-brush')).not.toBeNull();
		expect(container.querySelector('[role="status"]')?.textContent).toContain('own or are authorised');
		const buttons = [...container.querySelectorAll<HTMLButtonElement>('button')];
		expect(buttons.every((button) => typeof button.disabled === 'boolean')).toBe(true);
	});

	it('starts with patch action disabled until an image is chosen', () => {
		const patch = [...container.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent?.includes('Apply patch'));
		expect(patch?.disabled).toBe(true);
	});
});
