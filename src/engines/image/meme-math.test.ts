import { describe, expect, it } from 'vitest';
import { fitTextToBox } from './meme-math';

describe('fitTextToBox', () => {
	it('wraps and scales text so no line exceeds the text box', () => {
		const measure = (text: string, fontSize: number) => Array.from(text).length * fontSize * 0.58;
		const width = 180;
		const height = 88;
		const result = fitTextToBox(
			'THIS IS AN EXTREMELY LONG WORDWITHOUTSPACES followed by more words to fit',
			width,
			height,
			64,
			measure,
		);

		expect(result.lines.length * result.fontSize * result.lineHeight).toBeLessThanOrEqual(height);
		for (const line of result.lines) expect(measure(line, result.fontSize)).toBeLessThanOrEqual(width);
	});
});
