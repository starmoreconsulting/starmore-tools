const words = [
	'lorem','ipsum','dolor','sit','amet','consectetur','adipiscing','elit','sed','do','eiusmod','tempor','incididunt','ut','labore','et','dolore','magna','aliqua','enim','ad','minim','veniam','quis','nostrud','exercitation','ullamco','laboris','nisi','ut','aliquip','ex','ea','commodo','consequat','duis','aute','irure','dolor','in','reprehenderit','voluptate','velit','esse','cillum','dolore','eu','fugiat','nulla','pariatur','excepteur','sint','occaecat','cupidatat','non','proident','sunt','in','culpa','qui','officia','deserunt','mollit','anim','id','est','laborum'
];

export function generateLorem(mode: 'words' | 'sentences' | 'paragraphs', count: number, seed = 1) {
	if (!Number.isInteger(count) || count < 1 || count > 100) throw new Error('Count must be a whole number from 1 to 100.');
	let state = Math.abs(Math.trunc(seed)) || 1;
	const random = () => {
		state = (state * 48271) % 2147483647;
		return state / 2147483647;
	};
	const makeSentence = (sentenceIndex: number) => {
		const length = 12 + (Math.floor(random() * 8) + sentenceIndex) % 8;
		const sentence = Array.from({ length }, (_, index) => words[Math.floor(random() * words.length)] + (index === 0 ? '' : ''));
		sentence[0] = sentence[0].charAt(0).toUpperCase() + sentence[0].slice(1);
		return `${sentence.join(' ').replace(/\s+/g, ' ')}.`;
	};
	if (mode === 'words') {
		const output = Array.from({ length: count }, () => words[Math.floor(random() * words.length)]);
		output[0] = output[0].charAt(0).toUpperCase() + output[0].slice(1);
		return `${output.join(' ')}.`;
	}
	if (mode === 'sentences') {
		return Array.from({ length: count }, (_, index) => makeSentence(index)).join(' ');
	}
	return Array.from({ length: count }, (_, paragraphIndex) =>
		Array.from({ length: 4 + paragraphIndex % 3 }, (_, sentenceIndex) => makeSentence(paragraphIndex * 10 + sentenceIndex)).join(' ')
	).join('\n\n');
}
