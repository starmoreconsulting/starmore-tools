export type JavaScriptToken = {
	type: 'word' | 'literal' | 'comment' | 'regex' | 'punctuation';
	value: string;
	lineBreakBefore?: boolean;
	whitespaceBefore?: boolean;
};
type Group = { kind: 'block' | 'object' | 'array' | 'paren'; forLoop?: boolean };

const OPERATORS = [
	'>>>=', '===', '!==', '**=', '>>>', '<<=', '>>=', '=>', '==', '!=', '<=', '>=',
	'++', '--', '&&', '||', '??', '?.', '+=', '-=', '*=', '/=', '%=', '&=', '|=',
	'^=', '<<', '>>', '**', '...',
];
const REGEX_PREFIX_WORDS = new Set([
	'await', 'case', 'delete', 'else', 'in', 'instanceof', 'new', 'of', 'return',
	'throw', 'typeof', 'void', 'yield',
]);

function isWordStart(character: string): boolean {
	return /[A-Za-z_$]/.test(character);
}

function isWordPart(character: string): boolean {
	return /[\w$]/.test(character);
}

function scanQuoted(input: string, start: number, quote: string): number {
	for (let index = start + 1; index < input.length; index += 1) {
		if (input[index] === '\\') {
			index += 1;
			continue;
		}
		if (input[index] === quote) return index + 1;
		if ((quote === '"' || quote === "'") && /[\r\n]/.test(input[index])) {
			throw new Error('JavaScript contains an unclosed string.');
		}
	}
	throw new Error(`JavaScript contains an unclosed ${quote === '`' ? 'template literal' : 'string'}.`);
}

function scanTemplate(input: string, start: number): number {
	let index = start + 1;
	while (index < input.length) {
		if (input[index] === '\\') {
			index += 2;
			continue;
		}
		if (input[index] === '`') return index + 1;
		if (input[index] === '$' && input[index + 1] === '{') {
			index = scanTemplateExpression(input, index + 2);
			continue;
		}
		index += 1;
	}
	throw new Error('JavaScript contains an unclosed template literal.');
}

function scanTemplateExpression(input: string, start: number): number {
	let index = start;
	let depth = 1;
	let previous = '';
	while (index < input.length) {
		const character = input[index];
		const next = input[index + 1] ?? '';

		if (/\s/.test(character)) {
			index += 1;
			continue;
		}
		if (character === '"' || character === "'") {
			index = scanQuoted(input, index, character);
			previous = 'literal';
			continue;
		}
		if (character === '`') {
			index = scanTemplate(input, index);
			previous = 'literal';
			continue;
		}
		if (character === '/' && next === '/') {
			index += 2;
			while (index < input.length && !/[\r\n]/.test(input[index])) index += 1;
			continue;
		}
		if (character === '/' && next === '*') {
			const end = input.indexOf('*/', index + 2);
			if (end < 0) throw new Error('JavaScript contains an unclosed comment.');
			index = end + 2;
			continue;
		}
		if (character === '/' && isRegexAllowed(previous)) {
			index = scanRegex(input, index);
			previous = 'literal';
			continue;
		}
		if (character === '{') depth += 1;
		else if (character === '}') {
			depth -= 1;
			if (depth === 0) return index + 1;
		}

		if (isWordStart(character)) {
			const wordStart = index;
			index += 1;
			while (index < input.length && isWordPart(input[index])) index += 1;
			previous = input.slice(wordStart, index);
		} else {
			previous = character;
			index += 1;
		}
	}
	throw new Error('JavaScript contains an unclosed template expression.');
}

function isRegexAllowed(previous: string): boolean {
	return !previous || REGEX_PREFIX_WORDS.has(previous)
		|| ['(', '[', '{', ',', ':', ';', '=', '!', '?', '&', '|', '+', '-', '*', '%', '^', '~', '<', '>', '=>'].includes(previous);
}

function scanRegex(input: string, start: number): number {
	let inCharacterClass = false;
	for (let index = start + 1; index < input.length; index += 1) {
		const character = input[index];
		if (character === '\\') {
			index += 1;
			continue;
		}
		if (character === '[') inCharacterClass = true;
		else if (character === ']') inCharacterClass = false;
		else if (character === '/' && !inCharacterClass) {
			index += 1;
			while (index < input.length && isWordPart(input[index])) index += 1;
			return index;
		} else if (/[\r\n]/.test(character)) {
			throw new Error('JavaScript contains an unfinished regular expression.');
		}
	}
	throw new Error('JavaScript contains an unfinished regular expression.');
}

export function tokenizeJavaScript(input: string): JavaScriptToken[] {
	const tokens: JavaScriptToken[] = [];
	let index = 0;
	let previous = '';
	let lineBreakBefore = false;
	let whitespaceBefore = false;
	const addToken = (token: JavaScriptToken) => {
		tokens.push({ ...token, lineBreakBefore, whitespaceBefore });
		lineBreakBefore = false;
		whitespaceBefore = false;
	};

	while (index < input.length) {
		const character = input[index];
		const next = input[index + 1] ?? '';
		if (/\s/.test(character)) {
			whitespaceBefore = true;
			if (/[\r\n]/.test(character)) lineBreakBefore = true;
			index += 1;
			continue;
		}
		if (character === '/' && next === '/') {
			const start = index;
			index += 2;
			while (index < input.length && !/[\r\n]/.test(input[index])) index += 1;
			const value = input.slice(start, index);
			addToken({ type: 'comment', value });
			if (/[\r\n]/.test(value)) lineBreakBefore = true;
			previous = 'comment';
			continue;
		}
		if (character === '/' && next === '*') {
			const start = index;
			const end = input.indexOf('*/', index + 2);
			if (end < 0) throw new Error('JavaScript contains an unclosed comment.');
			index = end + 2;
			const value = input.slice(start, index);
			addToken({ type: 'comment', value });
			if (/[\r\n]/.test(value)) lineBreakBefore = true;
			previous = 'comment';
			continue;
		}
		if (character === '"' || character === "'") {
			const end = scanQuoted(input, index, character);
			const value = input.slice(index, end);
			addToken({ type: 'literal', value });
			index = end;
			previous = 'literal';
			continue;
		}
		if (character === '`') {
			const end = scanTemplate(input, index);
			const value = input.slice(index, end);
			addToken({ type: 'literal', value });
			index = end;
			previous = 'literal';
			continue;
		}
		if (character === '/' && isRegexAllowed(previous)) {
			const end = scanRegex(input, index);
			const value = input.slice(index, end);
			addToken({ type: 'regex', value });
			index = end;
			previous = 'literal';
			continue;
		}
		if (isWordStart(character) || /\d/.test(character)) {
			const start = index;
			index += 1;
			while (index < input.length && (isWordPart(input[index]) || (/\d/.test(character) && /[.]/.test(input[index])))) index += 1;
			const value = input.slice(start, index);
			addToken({ type: 'word', value });
			previous = value;
			continue;
		}

		const operator = OPERATORS.find((candidate) => input.startsWith(candidate, index));
		const value = operator ?? character;
		addToken({ type: 'punctuation', value });
		index += value.length;
		previous = value;
	}

	return tokens;
}

export function formatJavaScript(input: string, indentSize = 2): string {
	if (typeof input !== 'string') throw new Error('JavaScript input must be text.');
	if (!Number.isInteger(indentSize) || indentSize < 1 || indentSize > 8) {
		throw new Error('Indent size must be a whole number between 1 and 8.');
	}

	const tokens = tokenizeJavaScript(input);
	const indent = ' '.repeat(indentSize);
	const groups: Group[] = [];
	const output: string[] = [];
	let depth = 0;
	let needsSpace = false;
	let previous: JavaScriptToken | undefined;
	let previousWord = '';

	const trimLineEnd = () => {
		while (output.length && output[output.length - 1] === ' ') output.pop();
	};
	const space = () => {
		if (output.length && output[output.length - 1] !== '\n' && output[output.length - 1] !== ' ') output.push(' ');
	};
	const newline = () => {
		trimLineEnd();
		if (output.length && output[output.length - 1] !== '\n') output.push('\n');
		needsSpace = false;
	};
	const write = (value: string) => {
		if (needsSpace) space();
		if (!output.length || output[output.length - 1] === '\n') output.push(indent.repeat(Math.max(0, depth)));
		output.push(value);
		needsSpace = false;
	};
	const topGroup = () => groups[groups.length - 1];

	for (const token of tokens) {
		const value = token.value;
		const group = topGroup();
		if (token.lineBreakBefore && output.length && output[output.length - 1] !== '\n') newline();

		if (token.type === 'comment') {
			if (value.startsWith('//')) {
				if (output.length && output[output.length - 1] !== '\n') space();
				write(value);
				newline();
			} else {
				if (previous && !['(', '[', '{', '.', '?.'].includes(previous.value)) space();
				write(value);
				needsSpace = true;
			}
			previous = token;
			previousWord = '';
			continue;
		}

		if (value === '(') {
			if (previousWord === 'if' || previousWord === 'for' || previousWord === 'while' || previousWord === 'switch' || previousWord === 'catch' || previousWord === 'with') space();
			else if (previous?.value === 'function') space();
			else if (previous && (previous.type === 'word' || previous.type === 'literal' || previous.value === ')')) needsSpace = false;
			write('(');
			groups.push({ kind: 'paren', forLoop: previousWord === 'for' });
		} else if (value === ')') {
			if (groups[groups.length - 1]?.kind !== 'paren') throw new Error('JavaScript contains an unmatched closing parenthesis.');
			groups.pop();
			trimLineEnd();
			needsSpace = false;
			write(')');
			needsSpace = true;
		} else if (value === '[') {
			if (previous && (previous.type === 'word' || previous.type === 'literal' || previous.value === ')')) needsSpace = false;
			write('[');
			groups.push({ kind: 'array' });
		} else if (value === ']') {
			if (groups[groups.length - 1]?.kind !== 'array') throw new Error('JavaScript contains an unmatched closing bracket.');
			groups.pop();
			trimLineEnd();
			needsSpace = false;
			write(']');
			needsSpace = true;
		} else if (value === '{') {
			const isBlock = !previous || previous.value === '=>' || previous.value === ')'
				|| ['else', 'try', 'finally', 'do', 'class'].includes(previousWord);
			if (isBlock) {
				if (previous && previous.value !== '=>' && previous.value !== ')') space();
				write('{');
				groups.push({ kind: 'block' });
				depth += 1;
				newline();
			} else {
				if (previous && (previous.type === 'word' || previous.type === 'literal')) needsSpace = true;
				write('{');
				groups.push({ kind: 'object' });
				depth += 1;
				newline();
			}
		} else if (value === '}') {
			const closing = groups.pop();
			if (!closing || (closing.kind !== 'block' && closing.kind !== 'object')) {
				throw new Error('JavaScript contains an unmatched closing brace.');
			}
			depth -= 1;
			if (output.length && output[output.length - 1] !== '\n') newline();
			write('}');
			needsSpace = closing.kind === 'block';
		} else if (value === ';') {
			needsSpace = false;
			write(';');
			if (group?.kind === 'paren' && group.forLoop) needsSpace = true;
			else newline();
		} else if (value === ',') {
			needsSpace = false;
			write(',');
			if (group?.kind === 'object') newline();
			else needsSpace = true;
		} else if (value === '.') {
			trimLineEnd();
			needsSpace = false;
			write('.');
		} else if (value === '?.') {
			trimLineEnd();
			needsSpace = false;
			write('?.');
		} else if (value === ':') {
			trimLineEnd();
			needsSpace = false;
			write(':');
			needsSpace = true;
		} else if (value === '=>') {
			space();
			write('=>');
			needsSpace = true;
		} else {
			const isOperator = token.type === 'punctuation' && !['!', '~', '++', '--'].includes(value);
			if (isOperator) {
				space();
				write(value);
				needsSpace = true;
			} else {
				if (previous && (previous.type === 'word' || previous.type === 'literal' || previous.type === 'regex')
					&& (token.type === 'word' || token.type === 'literal' || token.type === 'regex')) needsSpace = true;
				if (value === '++' || value === '--') {
					if (previous && (previous.type === 'word' || previous.value === ')' || previous.value === ']')) needsSpace = false;
				}
				write(value);
				needsSpace = token.type === 'word' || token.type === 'literal' || token.type === 'regex'
					|| ((value === '++' || value === '--') && Boolean(previous)
						&& (previous.type === 'word' || previous.value === ')' || previous.value === ']'));
			}
		}

		previous = token;
		previousWord = token.type === 'word' ? value : '';
	}

	if (groups.length) {
		const unclosed = groups[groups.length - 1].kind;
		throw new Error(`JavaScript contains an unclosed ${unclosed === 'paren' ? 'parenthesis' : unclosed === 'array' ? 'bracket' : 'block'}.`);
	}
	trimLineEnd();
	return output.join('').trim();
}
