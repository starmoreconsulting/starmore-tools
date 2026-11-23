// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import PdfPasswordRecovery from './PdfPasswordRecovery';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let container: HTMLDivElement;
let root: Root;

beforeEach(()=>{container=document.createElement('div');document.body.append(container);root=createRoot(container);act(()=>root.render(<PdfPasswordRecovery/>));});
afterEach(()=>{act(()=>root.unmount());container.remove();});

describe('PdfPasswordRecovery',()=>{
	it('renders authorized, remembered-entry recovery controls and safety limits',()=>{
		expect(container.querySelector('#pdf-recovery-file')).not.toBeNull();
		expect(container.querySelector('#pdf-recovery-password')).not.toBeNull();
		expect(container.textContent).toContain('Try simple case and spacing variations');
		expect(container.textContent).toContain('no number or word guessing');
		expect(container.textContent).toContain('250 attempts per run');
		expect(container.querySelector<HTMLButtonElement>('button')?.disabled).toBe(true);
		expect(container.querySelector('[role="status"]')?.textContent).toContain('authorized');
		expect(container.textContent).toContain('do not paste downloaded wordlists');
	});
});
