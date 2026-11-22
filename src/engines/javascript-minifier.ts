import { tokenizeJavaScript, type JavaScriptToken } from './javascript-formatter';

const PRESERVED_COMMENT = /^(?:\/\*!|\/\/!)/;
const WORD_LIKE = new Set(['word', 'literal', 'regex']);
const OPERATORS = ['>>>=', '===', '!==', '**=', '>>>', '<<=', '>>=', '=>', '==', '!=', '<=', '>=',
	'++', '--', '&&', '||', '??', '?.', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '<<', '>>', '**', '...'];

function needsSeparator(previous: JavaScriptToken, current: JavaScriptToken): boolean {
	if (WORD_LIKE.has(previous.type) && WORD_LIKE.has(current.type)) return true;
	const joined = previous.value + current.value;
	const combinedOperator = OPERATORS.find((operator) => joined.startsWith(operator));
	return joined.startsWith('//') || joined.startsWith('/*')
		|| (combinedOperator !== undefined && combinedOperator !== previous.value);
}

export function minifyJavaScript(input: string): string {
	if (typeof input !== 'string') throw new Error('JavaScript input must be text.');

	const tokens = tokenizeJavaScript(input);
	const output: string[] = [];
	let previous: JavaScriptToken | undefined;
	let pendingCommentSeparator = false;

	for (const token of tokens) {
		if (token.type === 'comment') {
			if (!PRESERVED_COMMENT.test(token.value)) {
				pendingCommentSeparator = true;
				continue;
			}
			if (token.lineBreakBefore && output.length && !output[output.length - 1].endsWith('\n')) output.push('\n');
			else if (previous && (needsSeparator(previous, token) || token.whitespaceBefore)) output.push(' ');
			output.push(token.value);
			previous = token;
			if (token.value.startsWith('//')) output.push('\n');
			pendingCommentSeparator = false;
			continue;
		}

		if (token.lineBreakBefore) {
			if (output.length && !output[output.length - 1].endsWith('\n')) output.push('\n');
		} else if (previous && (needsSeparator(previous, token) || pendingCommentSeparator && needsSeparator(previous, token))) {
			output.push(' ');
		} else if (previous && previous.type === 'comment' && token.whitespaceBefore) {
			output.push(' ');
		}
		output.push(token.value);
		previous = token;
		pendingCommentSeparator = false;
	}

	return output.join('').trim();
}
