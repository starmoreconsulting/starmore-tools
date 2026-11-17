import { describe, expect, it } from 'vitest';
import { assertCleanOutput } from './clean-output.test-helper';
import { generatePositioning, type PositioningAnswers } from './positioning';

const complete: PositioningAnswers = {
	target: 'independent makers',
	brand: 'Harbor Studio',
	category: 'design partner',
	benefit: 'make useful spaces',
	reason: 'we work locally',
};

describe('positioning assistant', () => {
	it('uses infinitive-friendly structures and explains their parts', () => {
		const result = generatePositioning(complete);
		expect(result.options).toHaveLength(3);
		expect(result.options.map(({ statement }) => statement)).toEqual([
			'Harbor Studio helps independent makers make useful spaces, because we work locally.',
			'Harbor Studio is the design partner for independent makers who want to make useful spaces.',
			'For independent makers, Harbor Studio exists to help them make useful spaces.',
		]);
		expect(result.explanations).toHaveLength(4);
		for (const { statement } of result.options) assertCleanOutput(statement, Object.values(complete));
	});

	it('uses "we" when the optional brand name is empty', () => {
		const result = generatePositioning({ ...complete, brand: '' });
		expect(result.options.map(({ statement }) => statement)).toEqual([
			'We help independent makers make useful spaces, because we work locally.',
			'We are the design partner for independent makers who want to make useful spaces.',
			'For independent makers, we exist to help them make useful spaces.',
		]);
		for (const { statement } of result.options) assertCleanOutput(statement, Object.values(complete));
	});

	it('preserves lowercase and capitalized user inputs', () => {
		const capitalized = {
			target: 'Independent Makers',
			brand: 'Harbor Studio',
			category: 'Design Studio',
			benefit: 'Make Useful Spaces',
			reason: 'We Work Locally',
		};
		const result = generatePositioning(capitalized);
		expect(result.options[0].statement).toBe('Harbor Studio helps Independent Makers Make Useful Spaces, because We Work Locally.');
		for (const { statement } of result.options) assertCleanOutput(statement, Object.values(capitalized));
	});

	it.each([
		{
			benefit: 'save time',
			withBrand: [
				'Harbor Studio helps independent makers save time, because we work locally.',
				'Harbor Studio is the design partner for independent makers who want to save time.',
				'For independent makers, Harbor Studio exists to help them save time.',
			],
			withoutBrand: [
				'We help independent makers save time, because we work locally.',
				'We are the design partner for independent makers who want to save time.',
				'For independent makers, we exist to help them save time.',
			],
		},
		{
			benefit: 'saves time',
			withBrand: [
				'Harbor Studio helps independent makers save time, because we work locally.',
				'Harbor Studio is the design partner for independent makers who want to save time.',
				'For independent makers, Harbor Studio exists to help them save time.',
				'For independent makers, Harbor Studio is the design partner that saves time because we work locally.',
			],
			withoutBrand: [
				'We help independent makers save time, because we work locally.',
				'We are the design partner for independent makers who want to save time.',
				'For independent makers, we exist to help them save time.',
				'For independent makers, we are the design partner that saves time because we work locally.',
			],
		},
	])('writes complete sentences for the $benefit benefit form with or without a brand name', ({ benefit, withBrand, withoutBrand }) => {
		const withBrandResult = generatePositioning({ ...complete, benefit });
		expect(withBrandResult.options.map(({ statement }) => statement)).toEqual(withBrand);
		for (const { statement } of withBrandResult.options) assertCleanOutput(statement, Object.values(complete));

		const withoutBrandResult = generatePositioning({ ...complete, benefit, brand: '' });
		expect(withoutBrandResult.options.map(({ statement }) => statement)).toEqual(withoutBrand);
		for (const { statement } of withoutBrandResult.options) assertCleanOutput(statement, Object.values(complete));
	});

	it.each([
		['target', { target: '' }],
		['category', { category: '' }],
		['benefit', { benefit: '' }],
	] as const)('shows no statements when required %s is missing', (_field, missingAnswer) => {
		const result = generatePositioning({ ...complete, ...missingAnswer });
		expect(result.options).toEqual([]);
		expect(result.missing.length).toBe(1);
		expect(result.missing[0].hint.length).toBeGreaterThan(0);
	});

	it('shows all missing answers when only one answer is provided', () => {
		const result = generatePositioning({ target: complete.target, brand: '', category: '', benefit: '', reason: '' });
		expect(result.options).toEqual([]);
		expect(result.missing.map(({ field }) => field)).toEqual(['Category', 'Main benefit']);
		expect(result.missing.every(({ hint }) => hint.length > 0)).toBe(true);
	});

	it('sanitizes accented and long user answers without placeholders', () => {
		const long = 'é'.repeat(1200);
		const answers = {
			target: 'Créateurs de Lagos',
			brand: '',
			category: 'studio',
			benefit: `make ${long}`,
			reason: 'we work with care',
		};
		const result = generatePositioning(answers);
		expect(result.options).toHaveLength(3);
		for (const { statement } of result.options) assertCleanOutput(statement, Object.values(answers));
	});
});
