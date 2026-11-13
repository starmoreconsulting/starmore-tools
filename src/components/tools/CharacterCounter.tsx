import { useState } from 'react';

function countCharacters(text: string) {
	const characters = Array.from(text).length;
	const charactersWithoutSpaces = Array.from(text.replace(/\s/g, '')).length;
	const words = text.trim().match(/\S+/g)?.length ?? 0;
	const lines = text.length === 0 ? 0 : text.split(/\r\n|[\n\r\u2028\u2029]/).length;

	return { characters, charactersWithoutSpaces, words, lines };
}

export default function CharacterCounter() {
	const [text, setText] = useState('');
	const counts = countCharacters(text);

	return (
		<div>
			<label htmlFor="character-counter-input">Your text</label>
			<textarea
				id="character-counter-input"
				value={text}
				onChange={(event) => setText(event.target.value)}
				placeholder="Type or paste your text here..."
			/>
			<div className="calc-result-grid three-columns" aria-live="polite">
				<div className="calc-result featured">
					<span className="calc-label">CHARACTERS</span>
					<strong>{counts.characters}</strong>
				</div>
				<div className="calc-result">
					<span className="calc-label">WITHOUT SPACES</span>
					<strong>{counts.charactersWithoutSpaces}</strong>
				</div>
				<div className="calc-result">
					<span className="calc-label">WORDS</span>
					<strong>{counts.words}</strong>
				</div>
				<div className="calc-result">
					<span className="calc-label">LINES</span>
					<strong>{counts.lines}</strong>
				</div>
			</div>
		</div>
	);
}
