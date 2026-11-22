function normalizeFragment(value: string): string {
	let output = '';
	let quote = '';
	let inComment = false;
	let pendingSpace = false;

	for (let index = 0; index < value.length; index += 1) {
		const character = value[index];
		const next = value[index + 1] ?? '';

		if (inComment) {
			output += character;
			if (character === '*' && next === '/') {
				output += next;
				index += 1;
				inComment = false;
			}
			continue;
		}
		if (quote) {
			if (pendingSpace && output && !output.endsWith(' ')) output += ' ';
			pendingSpace = false;
			output += character;
			if (character === '\\' && index + 1 < value.length) {
				output += value[index + 1];
				index += 1;
			} else if (character === quote) {
				quote = '';
			}
			continue;
		}
		if (character === '/' && next === '*') {
			if (pendingSpace && output && !output.endsWith(' ')) output += ' ';
			pendingSpace = false;
			output += '/*';
			index += 1;
			inComment = true;
			continue;
		}
		if (character === '"' || character === "'") {
			if (pendingSpace && output && !output.endsWith(' ')) output += ' ';
			pendingSpace = false;
			output += character;
			quote = character;
			continue;
		}
		if (/\s/.test(character)) {
			pendingSpace = true;
			continue;
		}
		if (pendingSpace && output && !output.endsWith(' ')) output += ' ';
		pendingSpace = false;
		output += character;
	}

	return output.trim();
}

export function formatCss(input: string, indentSize = 2): string {
	if (typeof input !== 'string') throw new Error('CSS input must be text.');
	if (!Number.isInteger(indentSize) || indentSize < 1 || indentSize > 8) {
		throw new Error('Indent size must be a whole number between 1 and 8.');
	}

	let output = '';
	let fragment = '';
	let depth = 0;
	let parentheses = 0;
	let brackets = 0;
	let quote = '';
	let inComment = false;
	const indent = ' '.repeat(indentSize);

	const appendLine = (text: string, level = depth) => {
		const normalized = normalizeFragment(text);
		if (!normalized) return;
		output += `${indent.repeat(level)}${normalized}\n`;
	};

	for (let index = 0; index < input.length; index += 1) {
		const character = input[index];
		const next = input[index + 1] ?? '';

		if (inComment) {
			fragment += character;
			if (character === '*' && next === '/') {
				fragment += next;
				index += 1;
				inComment = false;
			}
			continue;
		}
		if (quote) {
			fragment += character;
			if (character === '\\' && index + 1 < input.length) {
				fragment += input[index + 1];
				index += 1;
			} else if (character === quote) {
				quote = '';
			}
			continue;
		}
		if (character === '/' && next === '*') {
			fragment += '/*';
			index += 1;
			inComment = true;
			continue;
		}
		if (character === '"' || character === "'") {
			fragment += character;
			quote = character;
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
		}

		if (parentheses === 0 && brackets === 0 && character === '{') {
			const prelude = normalizeFragment(fragment);
			if (!prelude) throw new Error('CSS contains a block without a selector or at-rule.');
			appendLine(`${prelude} {`);
			fragment = '';
			depth += 1;
			continue;
		}
		if (parentheses === 0 && brackets === 0 && character === '}') {
			appendLine(fragment);
			fragment = '';
			if (depth === 0) throw new Error('CSS contains an unmatched closing brace.');
			depth -= 1;
			output += `${indent.repeat(depth)}}\n`;
			continue;
		}
		if (parentheses === 0 && brackets === 0 && character === ';') {
			appendLine(`${fragment};`);
			fragment = '';
			continue;
		}
		fragment += character;
	}

	if (quote) throw new Error('CSS contains an unclosed string.');
	if (inComment) throw new Error('CSS contains an unclosed comment.');
	if (parentheses !== 0) throw new Error('CSS contains an unclosed parenthesis.');
	if (brackets !== 0) throw new Error('CSS contains an unclosed bracket.');
	if (depth !== 0) throw new Error('CSS contains an unclosed block.');
	appendLine(fragment);
	return output.trimEnd();
}
