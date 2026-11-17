import { describe, expect, it } from 'vitest';
import { assertCleanOutput } from './clean-output.test-helper';
import { generateMissionVision, type MissionVisionAnswers } from './mission-vision';

const complete: MissionVisionAnswers = {
	who: 'local makers',
	what: 'build useful spaces',
	how: 'thoughtful design',
	why: 'communities thrive',
};

describe('mission and vision templates', () => {
	it('creates three clean style variants when the required answers are complete', () => {
		const result = generateMissionVision(complete);
		expect(result.mission && Object.keys(result.mission)).toEqual(['plain', 'inspiring', 'concise']);
		expect(result.vision && Object.keys(result.vision)).toEqual(['plain', 'inspiring', 'concise']);
		expect(result.mission?.plain).toBe('We help local makers build useful spaces through thoughtful design so communities thrive.');
		expect(result.vision?.plain).toBe('A future where local makers can build useful spaces and, as a result, communities thrive.');
		expect(result.missing).toEqual([]);
		for (const text of [...Object.values(result.mission!), ...Object.values(result.vision!)]) {
			assertCleanOutput(text, Object.values(complete));
		}
	});

	it.each([
		['who', { who: '' }],
		['what', { what: '' }],
	] as const)('shows no statements when required answer %s is missing', (_field, missingAnswer) => {
		const result = generateMissionVision({ ...complete, ...missingAnswer });
		expect(result.mission).toBeNull();
		expect(result.vision).toBeNull();
		expect(result.missing).toHaveLength(1);
		expect(result.missing[0].hint.length).toBeGreaterThan(0);
	});

	it('lists every required answer when only one answer is provided', () => {
		const result = generateMissionVision({ who: 'local makers', what: '', how: '', why: '' });
		expect(result.mission).toBeNull();
		expect(result.vision).toBeNull();
		expect(result.missing.map(({ field }) => field)).toEqual(['What you do']);
	});

	it('supports accented and very long answers without placeholders', () => {
		const answers = {
			who: 'Créateurs de Lagos',
			what: `build ${'useful '.repeat(150)}spaces`,
			how: 'with care',
			why: 'communities thrive',
		};
		const result = generateMissionVision(answers);
		expect(result.mission).not.toBeNull();
		expect(result.vision).not.toBeNull();
		for (const text of [...Object.values(result.mission!), ...Object.values(result.vision!)]) {
			assertCleanOutput(text, Object.values(answers));
		}
	});
});
