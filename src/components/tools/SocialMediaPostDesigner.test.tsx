// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SocialMediaPostDesigner from './SocialMediaPostDesigner';
import SocialMediaImageSizeGuide from './SocialMediaImageSizeGuide';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
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
	const context = {
		canvas: null as unknown as HTMLCanvasElement,
		clearRect: vi.fn(), fillRect: vi.fn(), beginPath: vi.fn(), arc: vi.fn(), fill: vi.fn(), fillText: vi.fn(),
	} as unknown as CanvasRenderingContext2D;
	vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
		Object.defineProperty(context, 'canvas', { value: this, configurable: true });
		return context;
	});
	vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:post-export');
	vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
	vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
	container = document.createElement('div');
	document.body.append(container);
	root = createRoot(container);
	act(() => root.render(<SocialMediaPostDesigner />));
});

afterEach(() => {
	act(() => root.unmount());
	container.remove();
	vi.restoreAllMocks();
});

describe('SocialMediaPostDesigner', () => {
	it('updates the live drawing when copy changes and exports an SVG locally', async () => {
		act(() => setValue('#social-post-title', 'A new local headline'));
		expect(container.querySelector('canvas')?.getAttribute('aria-label')).toContain('1080 by 1080');
		expect(HTMLCanvasElement.prototype.getContext).toHaveBeenCalled();

		await act(async () => container.querySelector<HTMLButtonElement>('.tool-actions button.secondary')?.click());
		const exported = vi.mocked(URL.createObjectURL).mock.calls[0]?.[0];
		expect(exported).toBeInstanceOf(Blob);
		expect((exported as Blob).type).toBe('image/svg+xml;charset=utf-8');
		expect(await (exported as Blob).text()).toContain('A new local headline');
	});

	it('switches to a preset and allows custom output dimensions', () => {
		act(() => setValue('#social-post-size', 'youtube-thumbnail'));
		expect(container.querySelector('.inline-note')?.textContent).toContain('1,280 × 720 px');
		act(() => setValue('#social-post-size', 'custom'));
		act(() => setValue('#social-post-width', '900'));
		expect(container.querySelector('.inline-note')?.textContent).toContain('900 × 720 px');
		act(() => setValue('#social-post-width', '5000'));
		expect(container.querySelector('.inline-note')?.textContent).toContain('4,096 × 720 px');
		act(() => setValue('#social-post-height', '0'));
		expect(container.querySelector('.inline-note')?.textContent).toContain('4,096 × 1 px');
	});

	it('shows dated, source-linked size guidance for multiple platforms', () => {
		act(() => root.render(<SocialMediaImageSizeGuide />));
		expect(container.textContent).toContain('2026-11-13');
		expect(container.textContent).toContain('YouTube');
		expect(container.textContent).toContain('2,560 × 1,440 px');
		expect(container.querySelector('a[href="https://support.google.com/youtube/"]')?.textContent).toContain('YouTube Help Center');
	});
});
