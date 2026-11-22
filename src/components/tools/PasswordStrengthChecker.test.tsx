// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import PasswordStrengthChecker from './PasswordStrengthChecker';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
	container = document.createElement('div');
	document.body.append(container);
	root = createRoot(container);
	act(() => root.render(<PasswordStrengthChecker />));
});

afterEach(() => {
	act(() => root.unmount());
	container.remove();
});

describe('PasswordStrengthChecker', () => {
	it('shows a prompt until a password is entered', () => {
		expect(container.textContent).toContain('Not rated');
		expect(container.textContent).toContain('Enter a password to see a local strength estimate.');
	});

	it('updates the estimate as the user types', () => {
		const input = container.querySelector<HTMLInputElement>('#password-strength-input')!;
		act(() => {
			const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
			setter?.call(input, 'Password123');
			input.dispatchEvent(new Event('input', { bubbles: true }));
		});
		expect(container.textContent).toContain('Very weak');
		expect(container.textContent).toContain('This is a common password.');
	});

	it('supports revealing and hiding the entered password', () => {
		const input = container.querySelector<HTMLInputElement>('#password-strength-input')!;
		expect(input.type).toBe('password');
		act(() => container.querySelector<HTMLButtonElement>('[aria-label="Show password"]')?.click());
		expect(input.type).toBe('text');
		act(() => container.querySelector<HTMLButtonElement>('[aria-label="Hide password"]')?.click());
		expect(input.type).toBe('password');
	});
});
