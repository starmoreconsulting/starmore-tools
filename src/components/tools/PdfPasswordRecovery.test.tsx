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
	it('renders recovery controls and explanatory status',()=>{
		expect(container.querySelector('#pdf-recovery-file')).not.toBeNull();
		expect(container.querySelector('#pdf-recovery-mode')).not.toBeNull();
		expect(container.querySelector('#pdf-recovery-dictionary')).not.toBeNull();
		expect(container.querySelector<HTMLButtonElement>('button')?.disabled).toBe(true);
		expect(container.querySelector('[role="status"]')?.textContent).toContain('authorised');
		expect(container.textContent).toContain('Passwords you remember');
		expect(container.textContent).toContain('cannot guarantee recovery');
	});
});
