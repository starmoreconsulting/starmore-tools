import { useState } from 'react';
import { countWords } from '../../engines/text';

export default function WordCounter() {
	const [text, setText] = useState('');
	const counts = countWords(text);

	return (
		<div>
			<label htmlFor="word-counter-input">Your text</label>
			<textarea
				id="word-counter-input"
				value={text}
				onChange={(event) => setText(event.target.value)}
				placeholder="Start typing or paste your text here..."
			/>
			<div className="stats-row" aria-live="polite">
				<span><strong>{counts.words}</strong> words</span>
				<span><strong>{counts.characters}</strong> characters</span>
				<span><strong>{counts.charactersWithoutSpaces}</strong> without spaces</span>
				<span><strong>{counts.readingMinutes}</strong> min read</span>
			</div>
		</div>
	);
}
