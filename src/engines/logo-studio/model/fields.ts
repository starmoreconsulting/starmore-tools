import type { Element, LogoProject } from './types';
import { fitTextToBox } from '../templates/layouts/helpers';

export interface ProjectField {
	name: string;
	type: 'text' | 'image';
	value: string;
	variants: string[];
}

export interface FillFieldsResult {
	project: LogoProject;
	filled: string[];
	unmatched: string[];
	warnings: string[];
}

function fieldName(element: Element): string | null {
	if ((element.type !== 'text' && element.type !== 'image') || !element.fieldName?.trim()) return null;
	return element.fieldName.trim();
}

export function collectFields(project: LogoProject): ProjectField[] {
	const fields = new Map<string, ProjectField>();
	const visit = (elements: Element[], variant: string) => {
		for (const element of elements) {
			const name = fieldName(element);
			if (name) {
				const value = element.type === 'text' ? element.text ?? '' : element.src ?? '';
				const current = fields.get(name);
				if (current) {
					if (!current.variants.includes(variant)) current.variants.push(variant);
				} else {
					fields.set(name, { name, type: element.type, value, variants: [variant] });
				}
			}
			if (element.children) visit(element.children, variant);
		}
	};
	for (const [variant, elements] of Object.entries(project.variants)) visit(elements, variant);
	return [...fields.values()];
}

export function fillFields(
	project: LogoProject,
	values: Record<string, string | number>,
	options: { minimumFontSize?: number } = {},
): FillFieldsResult {
	const cloned = structuredClone(project);
	const fields = new Map(collectFields(project).map((field) => [field.name, field]));
	const supplied = Object.keys(values);
	const filled = supplied.filter((name) => fields.has(name));
	const unmatched = supplied.filter((name) => !fields.has(name));
	const warnings: string[] = [];

	const replace = (elements: Element[]) => elements.map((element) => {
		const name = fieldName(element);
		let next = element;
		if (name && Object.prototype.hasOwnProperty.call(values, name)) {
			const value = String(values[name]);
			if (element.type === 'text') {
				const fit = fitTextToBox(value, element, element.fontSize ?? 48, element.letterSpacing ?? 0, {
					minimumFontSize: options.minimumFontSize ?? 8,
				});
				next = { ...element, text: fit.text, fontSize: fit.fontSize };
				if (fit.overflow) warnings.push(`The “${name}” text does not fit its box at the minimum font size.`);
			} else if (element.type === 'image') {
				next = { ...element, src: value, fit: element.fit ?? 'contain' };
			}
		}
		if (next.children) next = { ...next, children: replace(next.children) };
		return next;
	});

	cloned.variants = Object.fromEntries(
		Object.entries(cloned.variants).map(([variant, elements]) => [variant, replace(elements)]),
	);
	return { project: cloned, filled, unmatched, warnings: [...new Set(warnings)] };
}
