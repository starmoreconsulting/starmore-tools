export function safeTextFilename(title: string) {
	const cleaned = title.trim().replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 80);
	return `${cleaned || 'untitled-notepad'}.txt`;
}

export function createTextDownload(text: string, title: string) {
	return { filename: safeTextFilename(title), blob: new Blob([text], { type: 'text/plain;charset=utf-8' }) };
}
