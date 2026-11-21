// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import ImageToTextOcr from './ImageToTextOcr';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
	container = document.createElement('div');
	document.body.append(container);
	root = createRoot(container);
	act(() => root.render(<ImageToTextOcr />));
});

afterEach(() => {
	act(() => root.unmount());
	container.remove();
});

describe('ImageToTextOcr', () => {
	it('renders an image input, extracted-text area and disabled action', () => {
		expect(container.querySelector<HTMLInputElement>('#ocr-file')).not.toBeNull();
		expect(container.querySelector<HTMLTextAreaElement>('#ocr-output')).not.toBeNull();
		expect(container.querySelector<HTMLButtonElement>('button')?.disabled).toBe(true);
		expect(container.querySelector('[role="status"]')?.textContent).toContain('printed English text');
	});
});
