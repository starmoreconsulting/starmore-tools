interface XmlToken {
	type: 'text' | 'open' | 'close' | 'special';
	value: string;
	name?: string;
	selfClosing?: boolean;
}

function findMarkupEnd(input: string, start: number): number {
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
	if (quote) throw new Error('XML contains an unclosed quoted attribute.');
	throw new Error('XML contains an unfinished tag.');
}

function tokenizeXml(input: string): XmlToken[] {
	const tokens: XmlToken[] = [];
	let index = 0;
	while (index < input.length) {
		const open = input.indexOf('<', index);
		if (open < 0) {
			const value = input.slice(index);
			if (value.trim()) tokens.push({ type: 'text', value: value.replace(/\s+/g, ' ').trim() });
			break;
		}
		if (open > index) {
			const value = input.slice(index, open);
			if (value.trim()) tokens.push({ type: 'text', value: value.replace(/\s+/g, ' ').trim() });
		}

		if (input.startsWith('<!--', open)) {
			const end = input.indexOf('-->', open + 4);
			if (end < 0) throw new Error('XML contains an unclosed comment.');
			tokens.push({ type: 'special', value: input.slice(open, end + 3) });
			index = end + 3;
			continue;
		}
		if (input.startsWith('<![CDATA[', open)) {
			const end = input.indexOf(']]>', open + 9);
			if (end < 0) throw new Error('XML contains an unclosed CDATA section.');
			tokens.push({ type: 'special', value: input.slice(open, end + 3) });
			index = end + 3;
			continue;
		}
		if (input.startsWith('<!DOCTYPE', open) || input.startsWith('<!doctype', open)) {
			const end = findMarkupEnd(input, open + 2);
			tokens.push({ type: 'special', value: input.slice(open, end + 1) });
			index = end + 1;
			continue;
		}
		if (input.startsWith('<?', open)) {
			const end = input.indexOf('?>', open + 2);
			if (end < 0) throw new Error('XML contains an unclosed processing instruction.');
			tokens.push({ type: 'special', value: input.slice(open, end + 2) });
			index = end + 2;
			continue;
		}

		const end = findMarkupEnd(input, open + 1);
		const value = input.slice(open, end + 1);
		const match = /^<\s*(\/?)\s*([A-Za-z_][\w:.-]*)/.exec(value);
		if (!match) throw new Error('XML contains an invalid element tag.');
		const closing = match[1] === '/';
		const name = match[2];
		const selfClosing = /\/\s*>$/.test(value);
		tokens.push({ type: closing ? 'close' : 'open', value, name, selfClosing });
		index = end + 1;
	}
	return tokens;
}

export function formatXml(input: string, indentSize = 2): string {
	if (typeof input !== 'string') throw new Error('XML input must be text.');
	if (!Number.isInteger(indentSize) || indentSize < 1 || indentSize > 8) {
		throw new Error('Indent size must be a whole number between 1 and 8.');
	}
	const tokens = tokenizeXml(input);
	const indent = ' '.repeat(indentSize);
	const stack: string[] = [];
	let output = '';

	const appendLine = (value: string, depth: number) => {
		if (output && !output.endsWith('\n')) output += '\n';
		output += `${indent.repeat(Math.max(0, depth))}${value}`;
	};

	for (const token of tokens) {
		if (token.type === 'text') {
			appendLine(token.value, stack.length);
			continue;
		}
		if (token.type === 'special') {
			appendLine(token.value, stack.length);
			continue;
		}
		if (token.type === 'open') {
			appendLine(token.value, stack.length);
			if (!token.selfClosing) stack.push(token.name ?? '');
			continue;
		}
		const expected = stack.pop();
		if (!expected) throw new Error(`XML contains an unmatched closing tag </${token.name}>.`);
		if (expected !== token.name) {
			throw new Error(`XML closing tag mismatch: expected </${expected}> but found </${token.name}>.`);
		}
		appendLine(token.value, stack.length);
	}

	if (stack.length) throw new Error(`XML contains an unclosed <${stack[stack.length - 1]}> element.`);
	return output.trim();
}
