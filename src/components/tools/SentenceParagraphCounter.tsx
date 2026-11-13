import { useState } from 'react';

function countText(text: string) {
	const trimmed = text.trim();
	const sentences = trimmed === ''
		? 0
		: (trimmed.match(/[^.!?]+(?:[.!?]+["')\]]*(?=\s|$)|$)/gu) ?? []).filter((sentence) => sentence.trim() !== '').length;
	const paragraphs = trimmed === '' ? 0 : trimmed.split(/\r?\n\s*\r?\n/u).filter((paragraph) => paragraph.trim() !== '').length;
	const words = trimmed.match(/\S+/gu)?.length ?? 0;
	return { sentences, paragraphs, words, characters: Array.from(text).length };
}

export default function SentenceParagraphCounter() {
	const [text, setText] = useState('');
	const counts = countText(text);

	return (
		<div>
			<label htmlFor="sentence-paragraph-text">Your text</label>
			<textarea id="sentence-paragraph-text" value={text} onChange={(event) => setText(event.target.value)} placeholder="Paste or type text here..." />
			<div className="calc-result-grid">
				<div className="calc-result featured">
					<span className="calc-label">SENTENCES</span>
					<strong>{counts.sentences}</strong>
				</div>
				<div className="calc-result">
					<span className="calc-label">PARAGRAPHS</span>
					<strong>{counts.paragraphs}</strong>
				</div>
				<div className="calc-result">
					<span className="calc-label">WORDS</span>
					<strong>{counts.words}</strong>
				</div>
				<div className="calc-result">
					<span className="calc-label">CHARACTERS</span>
					<strong>{counts.characters}</strong>
				</div>
			</div>
			<p className="inline-note">Sentence counts are estimates based on common sentence-ending punctuation.</p>
		</div>
	);
}
