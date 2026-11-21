// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import PresentationTemplateDesigner from './PresentationTemplateDesigner';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let container: HTMLDivElement; let root: Root;
beforeEach(() => { container=document.createElement('div'); document.body.append(container); root=createRoot(container); act(()=>root.render(<PresentationTemplateDesigner/>)); });
afterEach(()=>{act(()=>root.unmount());container.remove();});
describe('PresentationTemplateDesigner',()=>{
	it('renders a live 16 by 9 preview',()=>{expect(container.querySelector('.presentation-preview')).not.toBeNull();expect(container.querySelector('.presentation-preview')?.textContent).toContain('Starmore');});
	it('updates title and preview',()=>{const input=container.querySelector<HTMLInputElement>('#presentation-title')!;act(()=>{const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')?.set;setter?.call(input,'Quarterly Review');input.dispatchEvent(new Event('input',{bubbles:true}));});expect(container.querySelector('.presentation-preview h2')?.textContent).toBe('Quarterly Review');});
});