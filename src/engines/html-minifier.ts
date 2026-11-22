const RAW_TEXT_ELEMENTS = new Set(['pre', 'script', 'style', 'textarea', 'title']);
const CONDITIONAL_COMMENT = /^<!--\s*(?:\[if\b|<!\[endif\])/i;

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

function isTagStart(character: string): boolean {
	return character === '/' || character === '!' || character === '?' || /[a-z]/i.test(character);
}

export function minifyHtml(input: string): string {
	if (typeof input !== 'string') throw new Error('HTML input must be text.');

	let output = '';
	let index = 0;
	while (index < input.length) {
		if (input.startsWith('<!--', index)) {
			const end = input.indexOf('-->', index + 4);
			if (end < 0) throw new Error('HTML contains an unclosed comment.');
			const comment = input.slice(index, end + 3);
			if (CONDITIONAL_COMMENT.test(comment) || comment.startsWith('<!--!')) output += comment;
			index = end + 3;
			continue;
		}
		if (input.startsWith('<![CDATA[', index)) {
			const end = input.indexOf(']]>', index + 9);
			if (end < 0) throw new Error('HTML contains an unclosed CDATA section.');
			output += input.slice(index, end + 3);
			index = end + 3;
			continue;
		}

		if (input[index] === '<' && isTagStart(input[index + 1] ?? '')) {
			const end = findTagEnd(input, index + 1);
			const tag = input.slice(index, end + 1);
			output += tag;
			index = end + 1;

			const match = /^<\s*(\/?)\s*([a-z][\w:-]*)/i.exec(tag);
			if (!match || match[1]) continue;
			const name = match[2].toLowerCase();
			if (!RAW_TEXT_ELEMENTS.has(name) || /\/\s*>$/.test(tag)) continue;

			const close = findRawClose(input, index, name);
			output += input.slice(index, close.end);
			index = close.end;
			continue;
		}

		const nextTag = input.indexOf('<', index);
		const end = nextTag < 0 ? input.length : nextTag;
		const text = input.slice(index, end);
		output += text.replace(/\s+/g, ' ');
		index = end;
	}

	return output.trim();
}
