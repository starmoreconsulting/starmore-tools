import { describe, expect, it } from 'vitest';
import { assertCleanOutput } from './clean-output.test-helper';
import { sanitizeGeneratedText } from './sanitize';

describe('generated text sanitizer', () => {
	it('preserves the failing positioning sentence exactly', () => {
		const sentence = 'For independent makers, Harbor Studio is the design partner that make useful spaces because we work locally.';
		expect(sanitizeGeneratedText(sentence)).toBe(sentence);
	});

	it('preserves case after punctuation and in user-supplied names', () => {
		expect(sanitizeGeneratedText('first, We Make things: Next; Another. okay')).toBe('first, We Make things: Next; Another. okay');
		expect(sanitizeGeneratedText('Harbor Studio serves Lagos makers.')).toBe('Harbor Studio serves Lagos makers.');
	});

	it('normalizes spacing and punctuation without changing clean text', () => {
		expect(sanitizeGeneratedText('  two   spaces , ,  remain. .')).toBe('two spaces, remain.');
		const clean = 'Harbor Studio serves Lagos makers.';
		expect(sanitizeGeneratedText(clean)).toBe(clean);
	});

	it('is idempotent', () => {
		const input = '  Harbor Studio, We help Lagos makers . .\n  New line';
		const once = sanitizeGeneratedText(input);
		expect(sanitizeGeneratedText(once)).toBe(once);
	});

	it('supports the clean-output assertion and user-provided proper nouns', () => {
		assertCleanOutput('For Lagos couriers, Harbor Studio helps.', ['Harbor Studio']);
		assertCleanOutput('For Lagos couriers, SwiftMove helps.', ['SwiftMove']);
		expect(() => assertCleanOutput('For Lagos couriers, Helpful Studio helps.')).toThrow();
	});

	it('rejects broken or filler-shaped generated output', () => {
		for (const text of ['undefined', 'null', 'NaN', '[object Object]', '{slot}', 'two  spaces', 'This brand helps', 'Your business grows']) {
			expect(() => assertCleanOutput(text)).toThrow();
		}
	});
});
