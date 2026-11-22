// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import PdfPageNumberingTool from './PdfPageNumberingTool';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let container: HTMLDivElement;
let root: Root;

beforeEach(()=>{container=document.createElement('div');document.body.append(container);root=createRoot(container);act(()=>root.render(<PdfPageNumberingTool/>));});
afterEach(()=>{act(()=>root.unmount());container.remove();});

describe('PdfPageNumberingTool',()=>{
	it('renders file, scope and numbering controls',()=>{
		expect(container.querySelector('#pdf-number-file')).not.toBeNull();
		expect(container.querySelector('#pdf-number-position')).not.toBeNull();
		expect(container.querySelector('#pdf-number-format')).not.toBeNull();
		expect(container.querySelector<HTMLButtonElement>('button')?.disabled).toBe(true);
	});

	it('shows the page range field when all pages is disabled',()=>{
		const checkbox=container.querySelector<HTMLInputElement>('input[type="checkbox"]')!;
		act(()=>checkbox.click());
		expect(container.querySelector('#pdf-number-ranges')).not.toBeNull();
	});
});
