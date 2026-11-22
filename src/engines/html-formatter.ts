interface HtmlToken {
	type: 'text' | 'markup' | 'raw';
	value: string;
	name?: string;
	closing?: boolean;
	voidElement?: boolean;
}

const VOID_ELEMENTS = new Set([
	'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta',
	'param', 'source', 'track', 'wbr',
]);
const RAW_TEXT_ELEMENTS = new Set(['script', 'style', 'textarea', 'title']);
const BLOCK_ELEMENTS = new Set([
	'address', 'article', 'aside', 'blockquote', 'body', 'caption', 'colgroup',
	'dd', 'details', 'dialog', 'div', 'dl', 'dt', 'fieldset', 'figcaption',
	'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'head',
	'header', 'hgroup', 'hr', 'html', 'legend', 'li', 'main', 'menu', 'nav',
	'ol', 'optgroup', 'option', 'p', 'pre', 'section', 'summary', 'table',
	'tbody', 'td', 'tfoot', 'th', 'thead', 'tr', 'ul',
]);

function findTagEnd(input: string, start: number): number {
	let quote = '';
	for (let index = start; index < input.length; index += 1) {
		const character = input[index];
		if (quote) {
			if (character === quote) quote = '';
		} else if (character === '"' || character === "'") {
			quote = character;
		} else if (character === '>') {
			return index;
		}
	}
	if (quote) throw new Error('HTML contains an unclosed quoted attribute.');
	throw new Error('HTML contains an unfinished tag.');
}

function findRawClose(input: string, start: number, tagName: string): { index: number; end: number } {
	const closePattern = new RegExp(`<\\/\\s*${tagName}\\s*>`, 'ig');
	closePattern.lastIndex = start;
	const match = closePattern.exec(input);
	if (!match) throw new Error(`HTML contains an unclosed <${tagName}> element.`);
	return { index: match.index, end: closePattern.lastIndex };
}

function tokenizeHtml(input: string): HtmlToken[] {
	const tokens: HtmlToken[] = [];
	let index = 0;
	while (index < input.length) {
		const open = input.indexOf('<', index);
		if (open < 0) {
			tokens.push({ type: 'text', value: input.slice(index) });
			break;
		}
		if (open > index) tokens.push({ type: 'text', value: input.slice(index, open) });

		if (input.startsWith('<!--', open)) {
			const end = input.indexOf('-->', open + 4);
			if (end < 0) throw new Error('HTML contains an unclosed comment.');
			tokens.push({ type: 'markup', value: input.slice(open, end + 3) });
			index = end + 3;
			continue;
		}
		if (input.startsWith('<![CDATA[', open)) {
			const end = input.indexOf(']]>', open + 9);
			if (end < 0) throw new Error('HTML contains an unclosed CDATA section.');
			tokens.push({ type: 'markup', value: input.slice(open, end + 3) });
			index = end + 3;
			continue;
		}

		const next = input[open + 1] ?? '';
		if (!(next === '/' || next === '!' || next === '?' || /[a-z]/i.test(next))) {
			tokens.push({ type: 'text', value: '<' });
			index = open + 1;
			continue;
		}

		const end = findTagEnd(input, open + 1);
		const value = input.slice(open, end + 1);
		const tagMatch = /^<\s*(\/?)\s*([a-z][\w:-]*)/i.exec(value);
		index = end + 1;
		if (!tagMatch) {
			tokens.push({ type: 'markup', value });
			continue;
		}

		const closing = tagMatch[1] === '/';
		const name = tagMatch[2].toLowerCase();
		const voidElement = VOID_ELEMENTS.has(name) || /\/\s*>$/.test(value);
		if (!closing && RAW_TEXT_ELEMENTS.has(name)) {
			const rawClose = findRawClose(input, index, name);
			tokens.push({ type: 'raw', value: `${value}${input.slice(index, rawClose.end)}`, name });
			index = rawClose.end;
		} else {
			tokens.push({ type: 'markup', value, name, closing, voidElement });
		}
	}
	return tokens;
}

export function formatHtml(input: string, indentSize = 2): string {
	if (typeof input !== 'string') throw new Error('HTML input must be text.');
	if (!Number.isInteger(indentSize) || indentSize < 1 || indentSize > 8) {
		throw new Error('Indent size must be a whole number between 1 and 8.');
	}
	const tokens = tokenizeHtml(input);
	const indent = ' '.repeat(indentSize);
	const stack: string[] = [];
	let output = '';
	let previousWasBlockBoundary = true;

	const appendBoundary = (depth: number) => {
		output = output.replace(/[ \t]*$/, '');
		if (output && !output.endsWith('\n')) output += '\n';
		output += indent.repeat(Math.max(0, depth));
	};

	for (const token of tokens) {
		if (token.type === 'text') {
			if (!token.value.trim() && previousWasBlockBoundary) continue;
			output += token.value;
			if (token.value.trim()) previousWasBlockBoundary = false;
			continue;
		}

		if (token.type === 'raw') {
			if (previousWasBlockBoundary || token.name !== 'textarea') appendBoundary(stack.length);
			output += token.value;
			previousWasBlockBoundary = true;
			continue;
		}

		if (!token.name) {
			if (previousWasBlockBoundary) appendBoundary(stack.length);
			output += token.value;
			previousWasBlockBoundary = true;
			continue;
		}

		const isBlock = BLOCK_ELEMENTS.has(token.name);
		if (token.closing) {
			const stackIndex = stack.lastIndexOf(token.name);
			const closeDepth = stackIndex >= 0 ? stackIndex : stack.length;
			if (isBlock && previousWasBlockBoundary) appendBoundary(closeDepth);
			output += token.value;
			if (stackIndex >= 0) stack.length = stackIndex;
			previousWasBlockBoundary = isBlock;
			continue;
		}

		if (isBlock && previousWasBlockBoundary) appendBoundary(stack.length);
		output += token.value;
		if (!token.voidElement) stack.push(token.name);
		previousWasBlockBoundary = isBlock;
	}

	return output.trim();
}
