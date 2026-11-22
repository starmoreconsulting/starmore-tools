export type UrlEncodingMode = 'component' | 'url';
export type UrlEncodingAction = 'encode' | 'decode';

export function transformUrlText(
	input: string,
	action: UrlEncodingAction,
	mode: UrlEncodingMode = 'component',
): string {
	if (typeof input !== 'string') throw new Error('URL input must be text.');
	if (mode !== 'component' && mode !== 'url') throw new Error('Choose a valid URL encoding mode.');
	if (action !== 'encode' && action !== 'decode') throw new Error('Choose encode or decode.');

	try {
		if (mode === 'component') {
			return action === 'encode' ? encodeURIComponent(input) : decodeURIComponent(input);
		}
		return action === 'encode' ? encodeURI(input) : decodeURI(input);
	} catch (error) {
		if (error instanceof URIError) {
			throw new Error('The encoded text contains an invalid or incomplete percent escape or UTF-8 sequence.');
		}
		throw error;
	}
}
