// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import WordToPdfConverter from './WordToPdfConverter';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let container: HTMLDivElement;
let root: Root;

beforeEach(() => { container=document.createElement('div'); document.body.append(container); root=createRoot(container); act(()=>root.render(<WordToPdfConverter/>)); });
afterEach(()=>{ act(()=>root.unmount()); container.remove(); });

describe('WordToPdfConverter',()=>{
	it('renders DOCX input and a disabled action until a file is selected',()=>{
		expect(container.querySelector('#word-pdf-file')).not.toBeNull();
		expect(container.querySelector<HTMLButtonElement>('button')?.disabled).toBe(true);
		expect(container.querySelector('[role="status"]')?.textContent).toContain('locally');
	});

	it('enables conversion after selecting a DOCX file',()=>{
		const input=container.querySelector<HTMLInputElement>('#word-pdf-file')!;
		Object.defineProperty(input,'files',{value:[new File(['docx'],'report.docx',{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'})],configurable:true});
		act(()=>input.dispatchEvent(new Event('change',{bubbles:true})));
		expect(container.querySelector<HTMLButtonElement>('button')?.disabled).toBe(false);
		expect(container.querySelector('[role="status"]')?.textContent).toContain('DOCX selected');
	});
});
