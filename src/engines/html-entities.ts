export type HtmlEntityAction = 'encode' | 'decode';

const NAMED_ENTITIES: Record<string, string> = {
	amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0',
	copy: '©', reg: '®', trade: '™', cent: '¢', pound: '£', yen: '¥', euro: '€',
	hel: 'ℓ', hellip: '…', mdash: '—', ndash: '–', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”',
	laquo: '«', raquo: '»', middot: '·', bull: '•', times: '×', divide: '÷',
	deg: '°', plusmn: '±', micro: 'µ', para: '¶', sect: '§',
	aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú',
	Aacute: 'Á', Eacute: 'É', Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú',
	ntilde: 'ñ', Ntilde: 'Ñ',
};

export function encodeHtmlEntities(input: string): string {
	if (typeof input !== 'string') throw new Error('HTML entity input must be text.');
	return input.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function numericEntity(codePointText: string, hex: boolean): string {
	const codePoint = hex ? parseInt(codePointText, 16) : parseInt(codePointText, 10);
	if (!Number.isInteger(codePoint) || codePoint < 0 || codePoint > 0x10ffff) {
		throw new Error('An HTML numeric entity has an invalid code point.');
	}
	if (codePoint >= 0xd800 && codePoint <= 0xdfff) throw new Error('An HTML numeric entity cannot encode a surrogate.');
	return String.fromCodePoint(codePoint);
}

export function decodeHtmlEntities(input: string): string {
	if (typeof input !== 'string') throw new Error('HTML entity input must be text.');
	return input.replace(/&(?:#(x[\da-fA-F]+|\d+)|([a-zA-Z][\da-zA-Z]+));/g, (match, numeric: string, name: string) => {
		if (numeric) {
			if (numeric.startsWith('x') || numeric.startsWith('X')) return numericEntity(numeric.slice(1), true);
			return numericEntity(numeric, false);
		}
		if (Object.prototype.hasOwnProperty.call(NAMED_ENTITIES, name)) return NAMED_ENTITIES[name];
		throw new Error(`Unknown named HTML entity: &${name};`);
	});
}

export function transformHtmlEntities(input: string, action: HtmlEntityAction): string {
	if (action !== 'encode' && action !== 'decode') throw new Error('Choose encode or decode.');
	return action === 'encode' ? encodeHtmlEntities(input) : decodeHtmlEntities(input);
}
