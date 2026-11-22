// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import PdfPasswordProtection from './PdfPasswordProtection';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let container: HTMLDivElement;
let root: Root;

beforeEach(()=>{container=document.createElement('div');document.body.append(container);root=createRoot(container);act(()=>root.render(<PdfPasswordProtection/>));});
afterEach(()=>{act(()=>root.unmount());container.remove();});

describe('PdfPasswordProtection',()=>{
	it('renders password and permissions controls',()=>{
		expect(container.querySelector('#pdf-protect-file')).not.toBeNull();
		expect(container.querySelector('#pdf-protect-password')).not.toBeNull();
		expect(container.querySelector('#pdf-protect-confirm')).not.toBeNull();
		expect(container.querySelector('#pdf-protect-algorithm')).not.toBeNull();
		expect(container.querySelector<HTMLButtonElement>('button')?.disabled).toBe(true);
	});

	it('offers AES-256 and RC4 algorithms',()=>{
		const options=[...container.querySelectorAll<HTMLOptionElement>('#pdf-protect-algorithm option')].map((option)=>option.value);
		expect(options).toEqual(['AES-256','RC4']);
	});
});
