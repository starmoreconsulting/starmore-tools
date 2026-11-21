// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import TextComparisonTool from './TextComparisonTool';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
	container = document.createElement('div');
	document.body.append(container);
	root = createRoot(container);
	act(() => root.render(<TextComparisonTool />));
});

afterEach(() => {
	act(() => root.unmount());
	container.remove();
});

describe('TextComparisonTool', () => {
	it('shows counts and removed and added lines', () => {
		const left = container.querySelector<HTMLTextAreaElement>('#text-comparison-left')!;
		const right = container.querySelector<HTMLTextAreaElement>('#text-comparison-right')!;
		act(() => {
			const leftSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
			leftSetter?.call(left, 'one\ntwo');
			left.dispatchEvent(new Event('input', { bubbles: true }));
		});
		act(() => {
			const rightSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
			rightSetter?.call(right, 'one\nTWO\nthree');
			right.dispatchEvent(new Event('input', { bubbles: true }));
		});
		const stats = container.querySelector('.stats-row')?.textContent || '';
		expect(stats).toContain('1 unchanged');
		expect(stats).toContain('1 removed');
		expect(stats).toContain('2 added');
		expect(container.querySelectorAll('.text-diff-line.removed')).toHaveLength(1);
		expect(container.querySelectorAll('.text-diff-line.added')).toHaveLength(2);
	});
});
