// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BusinessProposalInput } from '../../engines/business-proposal';
import BusinessProposalGenerator from './BusinessProposalGenerator';

const { createBusinessProposalPdf, triggerDownload } = vi.hoisted(() => ({
	createBusinessProposalPdf: vi.fn(async (_input: BusinessProposalInput) => new Uint8Array([37, 80, 68, 70])),
	triggerDownload: vi.fn(),
}));

vi.mock('../../engines/business-proposal', async (importOriginal) => {
	const original = await importOriginal<typeof import('../../engines/business-proposal')>();
	return { ...original, createBusinessProposalPdf: (input: BusinessProposalInput) => createBusinessProposalPdf(input) };
});

vi.mock('../../engines/pdf', () => ({ triggerDownload }));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let container: HTMLDivElement;
let root: Root;

function setValue(selector: string, value: string) {
	const input = container.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector);
	if (!input) throw new Error(`Missing input ${selector}`);
	const prototype = input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
	Object.getOwnPropertyDescriptor(prototype, 'value')?.set?.call(input, value);
	input.dispatchEvent(new Event('input', { bubbles: true }));
	input.dispatchEvent(new Event('change', { bubbles: true }));
}

beforeEach(() => {
	createBusinessProposalPdf.mockClear();
	triggerDownload.mockClear();
	container = document.createElement('div');
	document.body.append(container);
	root = createRoot(container);
	act(() => root.render(<BusinessProposalGenerator />));
});

afterEach(() => {
	act(() => root.unmount());
	container.remove();
});

describe('BusinessProposalGenerator', () => {
	it('shows proposal details, project sections, and live preview', () => {
		expect(container.querySelector('#proposal-client')).not.toBeNull();
		expect(container.querySelector('#proposal-summary')).not.toBeNull();
		expect(container.querySelector('.proposal-preview')?.textContent).toContain('BUSINESS PROPOSAL');
		expect(container.querySelector('.proposal-preview')?.textContent).toContain('Client needs / challenge');
	});

	it('updates the live preview from the proposal form', () => {
		act(() => {
			setValue('#proposal-client', 'Example Client');
			setValue('#proposal-project-title', 'Website redesign');
			setValue('#proposal-summary', 'A new responsive website.');
			setValue('#proposal-investment', '2500');
		});
		const preview = container.querySelector('.proposal-preview');
		expect(preview?.textContent).toContain('Example Client');
		expect(preview?.textContent).toContain('Website redesign');
		expect(preview?.textContent).toContain('A new responsive website.');
		expect(preview?.textContent).toContain('NGN 2,500.00');
	});

	it('downloads the completed proposal as a PDF', async () => {
		act(() => {
			setValue('#proposal-client', 'Example Client');
			setValue('#proposal-project-title', 'Website redesign');
			setValue('#proposal-summary', 'A new responsive website.');
			setValue('#proposal-client-needs', 'The current site needs improvement.');
			setValue('#proposal-solution', 'Redesign and build the site.');
			setValue('#proposal-scope', 'Discovery, design, and implementation.');
			setValue('#proposal-deliverables', 'Website and handover notes.');
			setValue('#proposal-timeline', 'Four weeks.');
		});
		await act(async () => container.querySelector<HTMLButtonElement>('.tool-actions button')?.click());
		expect(createBusinessProposalPdf).toHaveBeenCalledTimes(1);
		expect(triggerDownload).toHaveBeenCalledTimes(1);
		expect(triggerDownload.mock.calls[0]?.[1]).toMatch(/\.pdf$/);
	});
});
