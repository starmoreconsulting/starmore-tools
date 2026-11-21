// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import PdfToImageConverter from './PdfToImageConverter';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let container: HTMLDivElement;
let root: Root;

beforeEach(() => { container=document.createElement('div');document.body.append(container);root=createRoot(container);act(()=>root.render(<PdfToImageConverter/>)); });
afterEach(()=>{act(()=>root.unmount());container.remove();});

describe('PdfToImageConverter',()=>{
	it('renders file, format and scale controls',()=>{
		expect(container.querySelector('#pdf-image-file')).not.toBeNull();
		expect(container.querySelector('#pdf-image-format')).not.toBeNull();
		expect(container.querySelector('#pdf-image-scale')).not.toBeNull();
		expect(container.querySelector<HTMLButtonElement>('button')?.disabled).toBe(true);
	});

	it('shows the local privacy and format guidance',()=>{
		expect(container.querySelector('[role="status"]')?.textContent).toContain('render pages locally');
		expect(container.textContent).toContain('Password-protected PDFs are not supported');
	});
});
