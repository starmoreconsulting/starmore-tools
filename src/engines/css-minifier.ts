const IMPORTANT_COMMENT = /^\/\*!/;
const COMPACT_PUNCTUATION = new Set(['{', '}', ';', ',']);

export function minifyCss(input: string): string {
	if (typeof input !== 'string') throw new Error('CSS input must be text.');

	let output = '';
	let quote = '';
	let inComment = false;
	let commentStart = -1;
	let importantComment = false;
	let pendingSpace = false;
	let parentheses = 0;
	let brackets = 0;
	let braces = 0;

	const append = (character: string) => {
		const previous = output[output.length - 1] ?? '';
		const removeSpace = COMPACT_PUNCTUATION.has(character) || COMPACT_PUNCTUATION.has(previous);
		if (pendingSpace && previous && !removeSpace) output += ' ';
		pendingSpace = false;
		output += character;
	};

	for (let index = 0; index < input.length; index += 1) {
		const character = input[index];
		const next = input[index + 1] ?? '';

		if (inComment) {
			if (character === '*' && next === '/') {
				if (importantComment) {
					output += '*/';
				} else {
					output = output.slice(0, commentStart);
					pendingSpace = true;
				}
				index += 1;
				inComment = false;
			} else {
				output += character;
			}
			continue;
		}

		if (quote) {
			append(character);
			if (character === '\\' && index + 1 < input.length) {
				output += input[index + 1];
				index += 1;
			} else if (character === quote) {
				quote = '';
			}
			continue;
		}

		if (character === '/' && next === '*') {
			commentStart = output.length;
			if (pendingSpace && output && !COMPACT_PUNCTUATION.has(output[output.length - 1])) output += ' ';
			pendingSpace = false;
			output += '/*';
			importantComment = IMPORTANT_COMMENT.test(input.slice(index, index + 3));
			index += 1;
			inComment = true;
			continue;
		}
		if (character === '"' || character === "'") {
			append(character);
			quote = character;
			continue;
		}
		if (/\s/.test(character)) {
			pendingSpace = true;
			continue;
		}

		if (character === '(') parentheses += 1;
		else if (character === ')') {
			parentheses -= 1;
			if (parentheses < 0) throw new Error('CSS contains an unmatched closing parenthesis.');
		} else if (character === '[') brackets += 1;
		else if (character === ']') {
			brackets -= 1;
			if (brackets < 0) throw new Error('CSS contains an unmatched closing bracket.');
		} else if (character === '{') braces += 1;
		else if (character === '}') {
			braces -= 1;
			if (braces < 0) throw new Error('CSS contains an unmatched closing brace.');
		}

		append(character);
	}

	if (quote) throw new Error('CSS contains an unclosed string.');
	if (inComment) throw new Error('CSS contains an unclosed comment.');
	if (parentheses !== 0) throw new Error('CSS contains an unclosed parenthesis.');
	if (brackets !== 0) throw new Error('CSS contains an unclosed bracket.');
	if (braces !== 0) throw new Error('CSS contains an unclosed block.');

	return output.trim();
}
