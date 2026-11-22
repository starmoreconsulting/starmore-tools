// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import ExcelToPdfConverter from './ExcelToPdfConverter';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let container: HTMLDivElement;
let root: Root;

beforeEach(() => { container=document.createElement('div'); document.body.append(container); root=createRoot(container); act(()=>root.render(<ExcelToPdfConverter/>)); });
afterEach(()=>{ act(()=>root.unmount()); container.remove(); });

describe('ExcelToPdfConverter',()=>{
	it('renders workbook input and disabled action',()=>{
		expect(container.querySelector('#excel-pdf-file')).not.toBeNull();
		expect(container.querySelector<HTMLButtonElement>('button')?.disabled).toBe(true);
		expect(container.querySelector('[role="status"]')?.textContent).toContain('XLSX');
	});
});
