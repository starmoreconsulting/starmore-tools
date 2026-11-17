export function sanitizeGeneratedText(value: string): string {
	return value
		.replace(/[{}]/g, '')
		.replace(/[^\S\r\n]+/g, ' ')
		.replace(/\s+([,!.?;:])/g, '$1')
		.replace(/([,!.?;:])(?:\s*[,!.?;:])+/g, (marks: string) => {
			if (marks.includes('?')) return '?';
			if (marks.includes('!')) return '!';
			if (marks.includes('.')) return '.';
			if (marks.includes(';')) return ';';
			if (marks.includes(':')) return ':';
			return marks.includes(',') ? ',' : '.';
		})
		.trim();
}
