import { useState } from 'react';
import { countCharacters } from '../../engines/text';

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
