export type SqlKeywordCase = 'upper' | 'lower' | 'preserve';

interface SqlToken {
	type: 'word' | 'quoted' | 'comment' | 'parameter' | 'punctuation';
	value: string;
}

const MAJOR_CLAUSES = new Set([
	'Select', 'From', 'Where', 'Join', 'Inner Join', 'Left Join', 'Right Join', 'Full Join',
	'Cross Join', 'Group By', 'Having', 'Order By', 'Limit', 'Offset', 'Union', 'Union All',
	'Except', 'Intersect', 'Insert Into', 'Update', 'Set', 'Delete From', 'Values', 'On', 'When', 'Then', 'Else', 'End',
]);

const KEYWORDS = new Set([
	'Select', 'From', 'Where', 'Join', 'Inner', 'Left', 'Right', 'Full', 'Outer', 'Cross', 'Natural',
	'Group', 'By', 'Having', 'Order', 'Asc', 'Desc', 'Limit', 'Offset', 'Union', 'All', 'Except', 'Intersect',
	'Insert', 'Into', 'Update', 'Set', 'Delete', 'Values', 'On', 'As', 'And', 'Or', 'Not', 'In', 'Is', 'Null',
	'Distinct', 'Case', 'When', 'Then', 'Else', 'End', 'Like', 'Between', 'Exists', 'Any', 'Some', 'Using',
	'Over', 'Partition', 'Window', 'With', 'Recursive', 'Create', 'Table', 'View', 'Index', 'Alter', 'Drop',
	'Truncate', 'Primary', 'Key', 'Foreign', 'References', 'Constraint', 'Default', 'Unique', 'Check', 'Cascade',
]);

function tokenizeSql(input: string): SqlToken[] {
	const tokens: SqlToken[] = [];
	let index = 0;
	while (index < input.length) {
		const character = input[index];
		const next = input[index + 1] ?? '';
		if (/\s/.test(character)) { index += 1; continue; }
		if (character === '-' && next === '-') {
			const start = index;
			index += 2;
			while (index < input.length && !/[\r\n]/.test(input[index])) index += 1;
			tokens.push({ type: 'comment', value: input.slice(start, index) });
			continue;
		}
		if (character === '/' && next === '*') {
			const end = input.indexOf('*/', index + 2);
			if (end < 0) throw new Error('SQL contains an unclosed block comment.');
			tokens.push({ type: 'comment', value: input.slice(index, end + 2) });
			index = end + 2;
			continue;
		}
		if (character === "'" || character === '"' || character === '`') {
			const quote = character;
			let value = quote;
			index += 1;
			let closed = false;
			while (index < input.length) {
				if (input[index] === '\\') {
					value += input[index] + (input[index + 1] ?? '');
					index += 2;
					continue;
				}
				if (input[index] === quote) {
					value += quote;
					index += 1;
					if (input[index] === quote) {
						value += quote;
						index += 1;
						continue;
					}
					closed = true;
					break;
				}
				value += input[index];
				index += 1;
			}
			if (!closed) throw new Error(`SQL contains an unclosed ${quote === "'" ? 'string' : 'identifier'} quote.`);
			tokens.push({ type: 'quoted', value });
			continue;
		}
		if (character === '[') {
			const end = input.indexOf(']', index + 1);
			if (end < 0) throw new Error('SQL contains an unclosed bracketed identifier.');
			tokens.push({ type: 'quoted', value: input.slice(index, end + 1) });
			index = end + 1;
			continue;
		}
		if (character === ':' || character === '@' || character === '?') {
			if (character === '?') {
				tokens.push({ type: 'parameter', value: '?' });
				index += 1;
			} else {
				const start = index;
				index += 1;
				while (index < input.length && /[\w.$]/.test(input[index])) index += 1;
				tokens.push({ type: 'parameter', value: input.slice(start, index) });
			}
			continue;
		}
		if (/[A-Za-z_]/.test(character)) {
			const start = index;
			index += 1;
			while (index < input.length && /[\w$]/.test(input[index])) index += 1;
			tokens.push({ type: 'word', value: input.slice(start, index) });
			continue;
		}
		if (/\d/.test(character)) {
			const start = index;
			index += 1;
			while (index < input.length && /[\w.]/.test(input[index])) index += 1;
			tokens.push({ type: 'word', value: input.slice(start, index) });
			continue;
		}
		const operators = ['||', '&&', '::', '->>', '->', '>=', '<=', '<>', '!=', '==', '+=', '-=', '*=', '/='];
		const operator = operators.find((candidate) => input.startsWith(candidate, index));
		const value = operator ?? character;
		tokens.push({ type: 'punctuation', value });
		index += value.length;
	}
	return tokens;
}

function titleCaseWord(value: string): string {
	return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function keywordValue(value: string, keywordCase: SqlKeywordCase): string {
	if (keywordCase === 'preserve') return value;
	return keywordCase === 'upper' ? value.toUpperCase() : value.toLowerCase();
}

function clauseName(tokens: SqlToken[], index: number): string {
	if (tokens[index]?.type !== 'word') return '';
	const words = [titleCaseWord(tokens[index].value)];
	for (let offset = 1; offset <= 2; offset += 1) {
		if (tokens[index + offset]?.type === 'word') {
			const candidate = `${words.join(' ')} ${titleCaseWord(tokens[index + offset].value)}`;
			if (MAJOR_CLAUSES.has(candidate)) words.push(titleCaseWord(tokens[index + offset].value));
			else break;
		}
	}
	return words.join(' ');
}

export function formatSql(input: string, indentSize = 2, keywordCase: SqlKeywordCase = 'upper'): string {
	if (typeof input !== 'string') throw new Error('SQL input must be text.');
	if (!Number.isInteger(indentSize) || indentSize < 1 || indentSize > 8) throw new Error('Indent size must be a whole number between 1 and 8.');
	if (!['upper', 'lower', 'preserve'].includes(keywordCase)) throw new Error('Choose upper, lower, or preserve keyword casing.');

	const tokens = tokenizeSql(input);
	const indent = ' '.repeat(indentSize);
	let output = '';
	let previousType = '';
	let previousValue = '';
	let pendingLine = false;
	let parentheses = 0;

	const newline = () => {
		output = output.trimEnd();
		if (output && !output.endsWith('\n')) output += '\n';
	};
	const write = (value: string) => {
		if (pendingLine) {
			newline();
			pendingLine = false;
		}
		if (output && !output.endsWith('\n') && !output.endsWith(' ')
			&& !['(', ',', '.', ';'].includes(value)
			&& !['(', '.', ')', '*'].includes(previousValue)) output += ' ';
		output += value;
		previousType = 'word';
		previousValue = value;
	};

	for (let index = 0; index < tokens.length; index += 1) {
		const token = tokens[index];
		if (token.type === 'comment') {
			newline();
			output += indent.repeat(Math.max(0, parentheses)) + token.value;
			newline();
			previousType = 'comment';
			previousValue = token.value;
			continue;
		}

		if (token.type === 'word') {
			const title = titleCaseWord(token.value);
			const candidateClause = clauseName(tokens, index);
			if (MAJOR_CLAUSES.has(candidateClause) && previousType !== 'punctuation') {
				newline();
				const clauseWords = candidateClause.split(' ');
				const clause = clauseWords.map((word) => keywordValue(word, keywordCase)).join(' ');
				output += indent.repeat(Math.max(0, parentheses)) + clause;
				index += clauseWords.length - 1;
				previousType = 'word';
				previousValue = clauseWords[clauseWords.length - 1];
				continue;
			}
			write(KEYWORDS.has(title) ? keywordValue(title, keywordCase) : token.value);
			previousType = 'word';
			previousValue = title;
			continue;
		}

		if (token.type === 'quoted') {
			write(token.value);
			previousType = 'quoted';
			previousValue = token.value;
			continue;
		}
		if (token.type === 'parameter') {
			write(token.value);
			previousType = 'parameter';
			previousValue = token.value;
			continue;
		}

		const value = token.value;
		if (value === '(') {
			if (output && !output.endsWith(' ') && !output.endsWith('\n') && previousValue !== '(') {
				const previousChar = output[output.length - 1];
				if (previousChar !== '.') output += ' ';
			}
			output += '(';
			parentheses += 1;
			previousType = 'punctuation';
			previousValue = '(';
			continue;
		}
		if (value === ')') {
			if (parentheses === 0) throw new Error('SQL contains an unmatched closing parenthesis.');
			parentheses -= 1;
			output = output.trimEnd();
			output += ')';
			if (parentheses === 0) {
				const next = tokens[index + 1];
				if (next?.type === 'word' && ['Values', 'Select'].includes(titleCaseWord(next.value))) pendingLine = true;
			}
			previousType = 'punctuation';
			previousValue = ')';
			continue;
		}
		if (value === ',') {
			output = output.trimEnd();
			output += ',';
			newline();
			output += indent.repeat(Math.max(1, parentheses));
			previousType = 'punctuation';
			previousValue = ',';
			continue;
		}
		if (value === ';') {
			output = output.trimEnd() + ';';
			newline();
			parentheses = 0;
			previousType = 'punctuation';
			previousValue = ';';
			continue;
		}
		if (value === '.') {
			output = output.trimEnd() + '.';
			previousType = 'punctuation';
			previousValue = '.';
			continue;
		}
		write(value);
		previousType = 'punctuation';
		previousValue = value;
	}

	if (parentheses !== 0) throw new Error('SQL contains an unclosed parenthesis.');
	return output.trim();
}
