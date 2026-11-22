import { useState } from 'react';
import { transformHtmlEntities } from '../../engines/html-entities';

export default function HtmlEntities() {
	const [input, setInput] = useState('');
	const [output, setOutput] = useState('');
	const [message, setMessage] = useState('');
	const [isError, setIsError] = useState(false);

	const transform = (action: 'encode' | 'decode') => {
		try {
			setOutput(transformHtmlEntities(input, action));
			setMessage(action === 'encode' ? 'HTML entities encoded successfully.' : 'HTML entities decoded successfully.');
			setIsError(false);
		} catch (error) {
			setOutput('');
			setMessage(error instanceof Error ? error.message : 'Could not transform this HTML entity text.');
			setIsError(true);
		}
	};

	const updateInput = (value: string) => {
		setInput(value);
		setOutput('');
		setMessage('');
		setIsError(false);
	};

	const copyOutput = async () => {
		try {
			await navigator.clipboard.writeText(output);
			setMessage('Copied to clipboard.');
			setIsError(false);
		} catch {
			setMessage('Could not access the clipboard. Select and copy the output instead.');
			setIsError(true);
		}
	};

	return (
		<div>
			<div className="json-columns">
				<div>
					<label htmlFor="html-entities-input">Input text or HTML entities</label>
					<textarea
						id="html-entities-input"
						value={input}
						onChange={(event) => updateInput(event.target.value)}
						placeholder={'<p title="Hello & goodbye">World</p>'}
						spellCheck={false}
					/>
				</div>
				<div>
					<label htmlFor="html-entities-output">Result</label>
					<pre className="json-output" id="html-entities-output" aria-live="polite">{output || 'Your encoded or decoded result will appear here.'}</pre>
				</div>
			</div>
			<div className="tool-actions">
				<button className="tool-button" type="button" onClick={() => transform('encode')} disabled={!input}>Encode</button>
				<button className="tool-button" type="button" onClick={() => transform('decode')} disabled={!input}>Decode</button>
				<button className="tool-button secondary" type="button" onClick={copyOutput} disabled={!output}>Copy result</button>
				<button className="tool-button secondary" type="button" onClick={() => updateInput('')} disabled={!input && !output}>Clear</button>
			</div>
			<p className={`tool-message${isError ? ' error' : ''}`} role="status">{message}</p>
			<p className="html-formatter-note">Encoding protects the five HTML-sensitive characters: ampersand, less-than, greater-than, double quote, and apostrophe. Decoding supports common named entities and decimal or hexadecimal numeric entities. Processing stays in your browser.</p>
		</div>
	);
}
