export function transformJson(input: string, mode: 'format' | 'minify') {
	const value: unknown = JSON.parse(input);
	return mode === 'format' ? JSON.stringify(value, null, 2) : JSON.stringify(value);
}
