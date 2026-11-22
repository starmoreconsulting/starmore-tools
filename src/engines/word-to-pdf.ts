export type WordPdfBlock =
	| { type: 'heading'; level: number; text: string }
	| { type: 'paragraph'; text: string }
	| { type: 'list-item'; text: string }
	| { type: 'table-row'; cells: string[] }
	| { type: 'image'; src: string; alt: string }
	| { type: 'page-break' };

export function extractWordPdfBlocks(html: string): WordPdfBlock[] {
	const template = document.createElement('template');
	template.innerHTML = html;
	const root = template.content;
	const blocks: WordPdfBlock[] = [];

	const visit = (node: Element) => {
		const tag = node.tagName.toLowerCase();
		if (/^h[1-6]$/.test(tag)) {
			const text = node.textContent?.trim();
			if (text) blocks.push({ type: 'heading', level: Number(tag.slice(1)), text });
			return;
		}
		if (tag === 'p') {
			const text = node.textContent?.trim();
			if (text) blocks.push({ type: 'paragraph', text });
			return;
		}
		if (tag === 'li') {
			const text = node.textContent?.trim();
			if (text) blocks.push({ type: 'list-item', text });
			return;
		}
		if (tag === 'tr') {
			const cells = Array.from(node.querySelectorAll(':scope > th, :scope > td')).map((cell) => cell.textContent?.trim() ?? '').filter(Boolean);
			if (cells.length) blocks.push({ type: 'table-row', cells });
			return;
		}
		if (tag === 'img') {
			const src = node.getAttribute('src') ?? '';
			if (src) blocks.push({ type: 'image', src, alt: node.getAttribute('alt') ?? '' });
			return;
		}
		if (tag === 'br' && node.getAttribute('class')?.includes('page-break')) {
			blocks.push({ type: 'page-break' });
			return;
		}
		Array.from(node.children).forEach(visit);
	};

	Array.from(root.children).forEach((element) => {
		if (element instanceof Element) visit(element);
	});
	return blocks;
}
