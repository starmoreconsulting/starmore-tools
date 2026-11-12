import { useState } from 'react';
import { toSentenceCase, toTitleCase } from '../../engines/text';

export default function CaseConverter() {
	const [text, setText] = useState('');
	const [message, setMessage] = useState('');

	const convert = (transform: (value: string) => string, label: string) => {
		setText((value) => transform(value));
		setMessage(label);
	};

	const copyText = async () => {
		try {
			await navigator.clipboard.writeText(text);
			setMessage('Copied to clipboard.');
		} catch {
			setMessage('Could not access the clipboard. Select and copy the text instead.');
		}
	};

	return (
		<div>
			<label htmlFor="case-input">Your text</label>
			<textarea
				id="case-input"
				value={text}
				onChange={(event) => {
					setText(event.target.value);
					setMessage('');
				}}
				placeholder="Type or paste your text here..."
			/>
			<div className="case-actions">
				<button className="tool-button" onClick={() => convert((value) => value.toUpperCase(), 'Converted to uppercase.')}>UPPERCASE</button>
				<button className="tool-button" onClick={() => convert((value) => value.toLowerCase(), 'Converted to lowercase.')}>lowercase</button>
				<button className="tool-button" onClick={() => convert(toTitleCase, 'Converted to title case.')}>Title Case</button>
				<button className="tool-button" onClick={() => convert(toSentenceCase, 'Converted to sentence case.')}>Sentence case</button>
				<button className="tool-button secondary" onClick={copyText} disabled={!text}>Copy text</button>
				<button className="tool-button secondary" onClick={() => { setText(''); setMessage(''); }} disabled={!text}>Clear</button>
			</div>
			<p className="tool-message" role="status">{message}</p>
		</div>
	);
}
