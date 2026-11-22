// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import PdfPasswordRemoval from './PdfPasswordRemoval';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let container: HTMLDivElement;
let root: Root;

beforeEach(()=>{container=document.createElement('div');document.body.append(container);root=createRoot(container);act(()=>root.render(<PdfPasswordRemoval/>));});
afterEach(()=>{act(()=>root.unmount());container.remove();});

describe('PdfPasswordRemoval',()=>{
	it('renders file and password controls',()=>{
		expect(container.querySelector('#pdf-remove-file')).not.toBeNull();
		expect(container.querySelector('#pdf-remove-password')).not.toBeNull();
		expect(container.querySelector<HTMLButtonElement>('button')?.disabled).toBe(true);
		expect(container.querySelector('[role="status"]')?.textContent).toContain('authorised');
	});
});
