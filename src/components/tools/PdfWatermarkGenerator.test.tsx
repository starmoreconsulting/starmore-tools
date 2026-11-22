// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import PdfWatermarkGenerator from './PdfWatermarkGenerator';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let container: HTMLDivElement;
let root: Root;

beforeEach(()=>{ container=document.createElement('div');document.body.append(container);root=createRoot(container);act(()=>root.render(<PdfWatermarkGenerator/>)); });
afterEach(()=>{act(()=>root.unmount());container.remove();});

describe('PdfWatermarkGenerator',()=>{
	it('renders file, text and layout controls',()=>{
		expect(container.querySelector('#pdf-watermark-file')).not.toBeNull();
		expect(container.querySelector<HTMLInputElement>('#pdf-watermark-text')?.value).toBe('CONFIDENTIAL');
		expect(container.querySelector('#pdf-watermark-position')).not.toBeNull();
		expect(container.querySelector<HTMLButtonElement>('button')?.disabled).toBe(true);
	});

	it('supports tiling and position options',()=>{
		const tile=container.querySelector<HTMLInputElement>('input[type="checkbox"]')!;
		act(()=>tile.click());
		expect(container.querySelector<HTMLSelectElement>('#pdf-watermark-position')?.disabled).toBe(true);
	});
});
