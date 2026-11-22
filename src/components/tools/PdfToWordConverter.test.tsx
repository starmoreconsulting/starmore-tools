// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import PdfToWordConverter from './PdfToWordConverter';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let container: HTMLDivElement;
let root: Root;

beforeEach(() => { container=document.createElement('div'); document.body.append(container); root=createRoot(container); act(()=>root.render(<PdfToWordConverter/>)); });
afterEach(()=>{ act(()=>root.unmount()); container.remove(); });

describe('PdfToWordConverter',()=>{
	it('renders PDF input and disabled action',()=>{
		expect(container.querySelector('#pdf-word-file')).not.toBeNull();
		expect(container.querySelector<HTMLButtonElement>('button')?.disabled).toBe(true);
		expect(container.querySelector('[role="status"]')?.textContent).toContain('Choose a PDF');
	});

	it('enables conversion after a PDF is selected',()=>{
		const input=container.querySelector<HTMLInputElement>('#pdf-word-file')!;
		Object.defineProperty(input,'files',{value:[new File(['pdf'],'sample.pdf',{type:'application/pdf'})],configurable:true});
		act(()=>input.dispatchEvent(new Event('change',{bubbles:true})));
		expect(container.querySelector<HTMLButtonElement>('button')?.disabled).toBe(false);
		expect(container.querySelector('[role="status"]')?.textContent).toContain('PDF selected');
	});
});
