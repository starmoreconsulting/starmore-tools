// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CompanyProfileInput } from '../../engines/company-profile';
import CompanyProfileGenerator from './CompanyProfileGenerator';

const { createCompanyProfilePdf, triggerDownload } = vi.hoisted(() => ({
	createCompanyProfilePdf: vi.fn(async (_input: CompanyProfileInput) => new Uint8Array([37, 80, 68, 70])),
	triggerDownload: vi.fn(),
}));

vi.mock('../../engines/company-profile', async (importOriginal) => {
	const original = await importOriginal<typeof import('../../engines/company-profile')>();
	return { ...original, createCompanyProfilePdf: (input: CompanyProfileInput) => createCompanyProfilePdf(input) };
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
	createCompanyProfilePdf.mockClear();
	triggerDownload.mockClear();
	container = document.createElement('div');
	document.body.append(container);
	root = createRoot(container);
	act(() => root.render(<CompanyProfileGenerator />));
});

afterEach(() => {
	act(() => root.unmount());
	container.remove();
});

describe('CompanyProfileGenerator', () => {
	it('shows company details, profile sections, and live preview', () => {
		expect(container.querySelector('#company-name')).not.toBeNull();
		expect(container.querySelector('#company-overview')).not.toBeNull();
		expect(container.querySelector('.company-profile-preview')?.textContent).toContain('COMPANY PROFILE');
		expect(container.querySelector('.company-profile-empty')?.textContent).toContain('build your profile preview');
	});

	it('updates the live preview from company profile fields', () => {
		act(() => {
			setValue('#company-name', 'Starmore Studio');
			setValue('#company-tagline', 'Small tools. Big momentum.');
			setValue('#company-industry', 'Digital services');
			setValue('#company-overview', 'We build browser-based tools.');
			setValue('#company-services', 'Web development');
			setValue('#company-email', 'hello@example.com');
		});
		const preview = container.querySelector('.company-profile-preview');
		expect(preview?.textContent).toContain('Starmore Studio');
		expect(preview?.textContent).toContain('Small tools. Big momentum.');
		expect(preview?.textContent).toContain('Digital services');
		expect(preview?.textContent).toContain('We build browser-based tools.');
		expect(preview?.textContent).toContain('Web development');
		expect(preview?.textContent).toContain('hello@example.com');
	});

	it('downloads the company profile as a PDF', async () => {
		act(() => {
			setValue('#company-name', 'Starmore Studio');
			setValue('#company-overview', 'We build browser-based tools.');
		});
		await act(async () => container.querySelector<HTMLButtonElement>('.tool-actions button')?.click());
		expect(createCompanyProfilePdf).toHaveBeenCalledTimes(1);
		expect(triggerDownload).toHaveBeenCalledTimes(1);
		expect(triggerDownload.mock.calls[0]?.[1]).toMatch(/\.pdf$/);
	});
});
